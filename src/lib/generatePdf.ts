import { jsPDF } from 'jspdf'
import type { LabelItem, LabelSettings } from '../types'
import { renderLabelToCanvas } from './renderLabel'

/** Этикетку есть смысл печатать, если задан штрих-код или хотя бы одно значение. */
export function isPrintable(items: LabelItem[]): boolean {
  return items.some((it) => it.value.trim())
}

/**
 * Собирает PDF из одной этикетки в нужном количестве копий.
 * Одна копия = одна страница точного размера в мм (картинка с canvas на весь лист).
 */
export function generatePdf(items: LabelItem[], settings: LabelSettings): void {
  if (!isPrintable(items)) return

  const copies = Math.max(1, Math.round(settings.copies) || 1)
  const { widthMm, heightMm } = settings
  const orientation = widthMm >= heightMm ? 'landscape' : 'portrait'

  // этикетка одна — рисуем canvas один раз и повторяем на всех страницах
  const dataUrl = renderLabelToCanvas(items, settings).toDataURL('image/png')

  const pdf = new jsPDF({ unit: 'mm', format: [widthMm, heightMm], orientation })
  for (let i = 0; i < copies; i += 1) {
    if (i > 0) pdf.addPage([widthMm, heightMm], orientation)
    pdf.addImage(dataUrl, 'PNG', 0, 0, widthMm, heightMm)
  }

  pdf.save('etiketki.pdf')
}
