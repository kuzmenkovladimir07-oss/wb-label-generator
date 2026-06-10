import type { LabelItem, LabelSettings } from '../types'
import { computeLabelLayout, MM_PER_PT, type Measure } from './labelLayout'
import { barcodeBars, displayDigits, resolveFormat } from './barcode'
import { LABEL_FONT_FAMILY } from './labelFont'

// Предпросмотр рисуем на canvas в высоком DPI (300). Тот же шрифт, что
// встраивается в PDF, подгружен как FontFace — поэтому раскладка совпадает.
const DPI = 300
const pxPerMm = DPI / 25.4
const fontStack = `${LABEL_FONT_FAMILY}, Arial, sans-serif`

// общий offscreen-контекст для измерения текста (в мм)
let measureCtx: CanvasRenderingContext2D | null = null
const canvasMeasure: Measure = (text, fontPt) => {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
  const ctx = measureCtx!
  ctx.font = `${fontPt * MM_PER_PT * pxPerMm}px ${fontStack}`
  return ctx.measureText(text).width / pxPerMm
}

function drawBarcode(
  ctx: CanvasRenderingContext2D,
  value: string,
  settings: LabelSettings,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const trimmed = value.trim()
  if (!trimmed) {
    ctx.save()
    ctx.font = `${Math.round(h * 0.25)}px ${fontStack}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#999'
    ctx.fillText('нет штрих-кода', x + w / 2, y + h / 2)
    ctx.restore()
    return
  }

  const fmt = resolveFormat(trimmed, settings.format)
  const bars = barcodeBars(trimmed, fmt)
  if (!bars) {
    ctx.save()
    ctx.font = `${Math.round(h * 0.22)}px ${fontStack}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#000'
    ctx.fillText(trimmed, x + w / 2, y + h / 2)
    ctx.restore()
    return
  }

  const digitsH = Math.min(h * 0.3, 3.5 * pxPerMm)
  const barsH = h - digitsH

  ctx.fillStyle = '#000'
  for (const b of bars) ctx.fillRect(x + b.x * w, y, b.w * w, barsH)

  const digits = displayDigits(trimmed, fmt)
  ctx.font = `${Math.round(digitsH * 0.8)}px ${fontStack}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(digits, x + w / 2, y + barsH + digitsH * 0.12)
}

export function renderLabelToCanvas(
  items: LabelItem[],
  settings: LabelSettings,
): HTMLCanvasElement {
  const layout = computeLabelLayout(items, settings, canvasMeasure)
  const W = Math.round(layout.widthMm * pxPerMm)
  const H = Math.round(layout.heightMm * pxPerMm)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)

  for (const op of layout.ops) {
    if (op.type === 'text') {
      ctx.fillStyle = '#000'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.font = `${op.fontPt * MM_PER_PT * pxPerMm}px ${fontStack}`
      let y = op.yTopMm * pxPerMm
      for (const line of op.lines) {
        ctx.fillText(line, W / 2, y)
        y += op.lineHeightMm * pxPerMm
      }
    } else {
      drawBarcode(
        ctx,
        op.value,
        settings,
        op.xMm * pxPerMm,
        op.yMm * pxPerMm,
        op.wMm * pxPerMm,
        op.hMm * pxPerMm,
      )
    }
  }

  return canvas
}
