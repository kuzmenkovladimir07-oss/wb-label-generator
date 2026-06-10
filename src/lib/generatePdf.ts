import { jsPDF } from 'jspdf'
import type { LabelItem, LabelSettings } from '../types'
import { computeLabelLayout, MM_PER_PT, type Measure } from './labelLayout'
import { barcodeBars, displayDigits, resolveFormat } from './barcode'
import { LABEL_FONT_TTF_BASE64 } from './font'

const FONT_NAME = 'WBLabel'

/** Этикетку есть смысл печатать, если задан штрих-код или хотя бы одно значение. */
export function isPrintable(items: LabelItem[]): boolean {
  return items.some((it) => it.value.trim())
}

function registerFont(pdf: jsPDF) {
  pdf.addFileToVFS('WBLabel.ttf', LABEL_FONT_TTF_BASE64)
  pdf.addFont('WBLabel.ttf', FONT_NAME, 'normal')
  pdf.setFont(FONT_NAME, 'normal')
}

function drawBarcode(
  pdf: jsPDF,
  value: string,
  settings: LabelSettings,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const trimmed = value.trim()
  const fmt = resolveFormat(trimmed, settings.format)
  const bars = trimmed ? barcodeBars(trimmed, fmt) : null

  if (!bars) {
    pdf.setFontSize(Math.max(6, h * 0.6))
    pdf.text(trimmed || 'нет штрих-кода', x + w / 2, y + h / 2, {
      align: 'center',
      baseline: 'middle',
    })
    return
  }

  const digitsMm = Math.min(h * 0.3, 3.5)
  const barsH = h - digitsMm

  // штрихи — настоящие векторные прямоугольники
  pdf.setFillColor(0, 0, 0)
  for (const b of bars) pdf.rect(x + b.x * w, y, b.w * w, barsH, 'F')

  // цифры под кодом — векторный текст
  const digits = displayDigits(trimmed, fmt)
  let dpt = (digitsMm / MM_PER_PT) * 0.85
  pdf.setFontSize(dpt)
  while (pdf.getTextWidth(digits) > w && dpt > 4) {
    dpt -= 0.5
    pdf.setFontSize(dpt)
  }
  pdf.text(digits, x + w / 2, y + barsH + digitsMm * 0.12, { align: 'center', baseline: 'top' })
}

/**
 * Собирает ВЕКТОРНЫЙ PDF с одной этикеткой: текст — встроенным шрифтом,
 * штрих-код — прямоугольниками. Качество не теряется при любом масштабе.
 */
export function generatePdf(items: LabelItem[], settings: LabelSettings): void {
  if (!isPrintable(items)) return

  const { widthMm, heightMm } = settings
  const orientation = widthMm >= heightMm ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ unit: 'mm', format: [widthMm, heightMm], orientation })
  registerFont(pdf)

  const measure: Measure = (text, fontPt) => {
    pdf.setFontSize(fontPt)
    return pdf.getTextWidth(text)
  }
  const layout = computeLabelLayout(items, settings, measure)

  pdf.setTextColor(0, 0, 0)
  for (const op of layout.ops) {
    if (op.type === 'text') {
      let y = op.yTopMm
      for (const line of op.lines) {
        pdf.setFontSize(op.fontPt)
        pdf.text(line, widthMm / 2, y, { align: 'center', baseline: 'top' })
        y += op.lineHeightMm
      }
    } else {
      drawBarcode(pdf, op.value, settings, op.xMm, op.yMm, op.wMm, op.hMm)
    }
  }

  pdf.save('etiketki.pdf')
}
