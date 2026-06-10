import type { LabelItem, LabelSettings } from '../types'

export const MM_PER_PT = 0.352778
const LINE_FACTOR = 1.25
const PAD_MM = 2
const GAP_MM = 1.2

/** Измеритель ширины текста (в мм) для заданного кегля в пунктах. */
export type Measure = (text: string, fontPt: number) => number

export interface TextOp {
  type: 'text'
  lines: string[]
  yTopMm: number
  fontPt: number
  lineHeightMm: number
}

export interface BarcodeOp {
  type: 'barcode'
  value: string
  xMm: number
  yMm: number
  wMm: number
  hMm: number
}

export type LabelOp = TextOp | BarcodeOp

export interface LabelLayout {
  widthMm: number
  heightMm: number
  ops: LabelOp[]
}

interface Rend {
  kind: 'text' | 'barcode'
  text?: string
  value?: string
}

function buildRends(items: LabelItem[]): Rend[] {
  const out: Rend[] = []
  for (const it of items) {
    if (it.kind === 'barcode') {
      out.push({ kind: 'barcode', value: it.value })
      continue
    }
    const v = it.value.trim()
    if (!v) continue
    const name = it.name.trim()
    out.push({ kind: 'text', text: it.showName && name ? `${name}: ${v}` : v })
  }
  return out
}

function wrap(measure: Measure, text: string, fontPt: number, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (measure(candidate, fontPt) <= maxW) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function cap(
  measure: Measure,
  lines: string[],
  fontPt: number,
  maxW: number,
  maxLines: number,
): string[] {
  if (lines.length <= maxLines) return lines
  const capped = lines.slice(0, maxLines)
  let last = capped[maxLines - 1]
  while (last && measure(last + '…', fontPt) > maxW) last = last.slice(0, -1)
  capped[maxLines - 1] = last + '…'
  return capped
}

/**
 * Считает раскладку этикетки в миллиметрах: подбирает самый крупный кегль,
 * при котором всё помещается; текст занимает свою высоту, штрих-код — остаток.
 * Один и тот же результат используют и предпросмотр (canvas), и PDF.
 */
export function computeLabelLayout(
  items: LabelItem[],
  settings: LabelSettings,
  measure: Measure,
): LabelLayout {
  const W = settings.widthMm
  const H = settings.heightMm
  const innerW = W - PAD_MM * 2
  const availH = H - PAD_MM * 2

  const rends = buildRends(items)
  const minBarcodeMm = Math.max(8, availH * 0.28)
  const maxPt = settings.fontSize
  const minPt = Math.max(4, maxPt * 0.45)

  interface Prepared {
    kind: 'text' | 'barcode'
    lines?: string[]
    h: number
    lineHeightMm?: number
    fontPt?: number
    value?: string
  }

  const buildAt = (pt: number) => {
    const lineH = pt * MM_PER_PT * LINE_FACTOR
    let textH = 0
    const prepared: Prepared[] = rends.map((r) => {
      if (r.kind === 'text') {
        const lines = cap(measure, wrap(measure, r.text ?? '', pt, innerW), pt, innerW, 2)
        const h = lines.length * lineH
        textH += h
        return { kind: 'text', lines, h, lineHeightMm: lineH, fontPt: pt }
      }
      return { kind: 'barcode', h: 0, value: r.value }
    })
    const gaps = GAP_MM * Math.max(0, rends.length - 1)
    const barcodeH = availH - textH - gaps
    return { prepared, barcodeH }
  }

  let chosen = buildAt(maxPt)
  for (let pt = maxPt; pt >= minPt - 0.001; pt -= 0.5) {
    const built = buildAt(pt)
    chosen = built
    if (built.barcodeH >= minBarcodeMm) break
  }

  const barcodeH = Math.max(chosen.barcodeH, minBarcodeMm)
  const ops: LabelOp[] = []
  let y = PAD_MM
  for (const p of chosen.prepared) {
    if (p.kind === 'text') {
      ops.push({
        type: 'text',
        lines: p.lines ?? [],
        yTopMm: y,
        fontPt: p.fontPt ?? maxPt,
        lineHeightMm: p.lineHeightMm ?? maxPt * MM_PER_PT * LINE_FACTOR,
      })
      y += p.h
    } else {
      ops.push({ type: 'barcode', value: p.value ?? '', xMm: PAD_MM, yMm: y, wMm: innerW, hMm: barcodeH })
      y += barcodeH
    }
    y += GAP_MM
  }

  return { widthMm: W, heightMm: H, ops }
}
