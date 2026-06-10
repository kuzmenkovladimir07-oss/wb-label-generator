import { jsPDF } from 'jspdf'
import type { Row, LabelSettings } from '../types'
import { renderLabelToCanvas } from './renderLabel'

/** Считаем строку «печатаемой», если задан хотя бы штрих-код или название. */
export function isPrintable(row: Row): boolean {
  return Boolean(row.barcode.trim() || row.name.trim() || row.article.trim())
}

/**
 * Собирает PDF: одна этикетка = одна страница точного размера в мм.
 * Каждая страница — картинка этикетки, отрисованной на canvas, на весь лист.
 */
export function generatePdf(rows: Row[], settings: LabelSettings): void {
  const printable = rows.filter(isPrintable)
  if (printable.length === 0) return

  const { widthMm, heightMm } = settings
  const orientation = widthMm >= heightMm ? 'landscape' : 'portrait'

  const pdf = new jsPDF({
    unit: 'mm',
    format: [widthMm, heightMm],
    orientation,
  })

  printable.forEach((row, index) => {
    if (index > 0) pdf.addPage([widthMm, heightMm], orientation)
    const canvas = renderLabelToCanvas(row, settings)
    const dataUrl = canvas.toDataURL('image/png')
    pdf.addImage(dataUrl, 'PNG', 0, 0, widthMm, heightMm)
  })

  pdf.save('etiketki.pdf')
}
