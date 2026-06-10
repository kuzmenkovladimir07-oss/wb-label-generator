import { jsPDF } from 'jspdf'
import type { LabelItem, LabelSettings } from '../types'
import { renderLabelToCanvas } from './renderLabel'

/** Этикетку есть смысл печатать, если задан штрих-код или хотя бы одно значение. */
export function isPrintable(items: LabelItem[]): boolean {
  return items.some((it) => it.value.trim())
}

/**
 * Собирает PDF с одной этикеткой — страница точного размера в мм
 * (картинка с canvas на весь лист).
 */
export function generatePdf(items: LabelItem[], settings: LabelSettings): void {
  if (!isPrintable(items)) return

  const { widthMm, heightMm } = settings
  const orientation = widthMm >= heightMm ? 'landscape' : 'portrait'

  const dataUrl = renderLabelToCanvas(items, settings).toDataURL('image/png')

  const pdf = new jsPDF({ unit: 'mm', format: [widthMm, heightMm], orientation })
  pdf.addImage(dataUrl, 'PNG', 0, 0, widthMm, heightMm)
  pdf.save('etiketki.pdf')
}
