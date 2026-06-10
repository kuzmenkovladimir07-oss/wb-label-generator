import JsBarcode from 'jsbarcode'
import type { LabelItem, LabelSettings } from '../types'

// Рендерим этикетку на canvas в высоком DPI (300), чтобы при печати на
// термопринтере было чётко. Текст рисуем средствами Canvas 2D — кириллица
// поддерживается системным шрифтом без возни со встраиванием шрифта в PDF.
const DPI = 300
const pxPerMm = DPI / 25.4

const mm = (v: number) => Math.round(v * pxPerMm)

/** EAN-13 валиден только из 12–13 цифр (13-й — контрольный, JsBarcode досчитает). */
export function isValidEan13(value: string): boolean {
  return /^\d{12,13}$/.test(value.trim())
}

type ItemKindResolved = 'text' | 'barcode'

interface Rend {
  kind: ItemKindResolved
  text?: string
  value?: string
}

/** Превращаем поля в то, что реально рисуется: пустые текстовые поля пропускаем. */
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
    const text = it.showName && name ? `${name}: ${v}` : v
    out.push({ kind: 'text', text })
  }
  return out
}

/** Жадно разбиваем текст на строки по ширине maxW при текущем ctx.font. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxW) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Обрезаем до maxLines строк, последнюю при необходимости с многоточием. */
function capLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  maxW: number,
  maxLines: number,
): string[] {
  if (lines.length <= maxLines) return lines
  const capped = lines.slice(0, maxLines)
  let last = capped[maxLines - 1]
  while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1)
  capped[maxLines - 1] = last + '…'
  return capped
}

interface Prepared {
  kind: ItemKindResolved
  lines?: string[]
  value?: string
  h: number
}

interface Layout {
  prepared: Prepared[]
  fits: boolean
}

/** Раскладка при заданном размере шрифта: текст занимает свою высоту, штрих-код — остаток. */
function layoutAt(
  ctx: CanvasRenderingContext2D,
  rends: Rend[],
  fontPx: number,
  innerW: number,
  availH: number,
  gap: number,
): Layout {
  const lineH = Math.round(fontPx * 1.25)
  let textH = 0
  const prepared: Prepared[] = rends.map((r) => {
    if (r.kind === 'text') {
      ctx.font = `${fontPx}px Arial, sans-serif`
      const lines = capLines(ctx, wrapLines(ctx, r.text ?? '', innerW), innerW, 2)
      const h = lines.length * lineH
      textH += h
      return { kind: 'text' as const, lines, h }
    }
    return { kind: 'barcode' as const, value: r.value, h: 0 }
  })

  const gaps = gap * Math.max(0, rends.length - 1)
  const minBarcodeH = Math.max(mm(8), Math.round(availH * 0.28))
  let barcodeH = availH - textH - gaps
  const fits = barcodeH >= minBarcodeH
  if (!fits) barcodeH = minBarcodeH
  for (const p of prepared) if (p.kind === 'barcode') p.h = barcodeH

  return { prepared, fits }
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
    ctx.font = `${Math.round(h * 0.25)}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#999'
    ctx.fillText('нет штрих-кода', x + w / 2, y + h / 2)
    ctx.restore()
    return
  }

  // EAN-13 только если значение валидно, иначе откатываемся на Code-128
  const useFormat =
    settings.format === 'EAN13' && isValidEan13(trimmed) ? 'EAN13' : 'CODE128'

  const tmp = document.createElement('canvas')
  try {
    JsBarcode(tmp, trimmed, {
      format: useFormat,
      width: Math.max(2, Math.round(w / 110)),
      height: Math.max(Math.round(h * 0.72), 40),
      displayValue: true,
      fontSize: Math.max(Math.round(h * 0.2), 16),
      font: 'Arial',
      textMargin: Math.round(h * 0.04),
      margin: 0,
    })
  } catch {
    ctx.save()
    ctx.font = `${Math.round(h * 0.22)}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#000'
    ctx.fillText(trimmed, x + w / 2, y + h / 2)
    ctx.restore()
    return
  }

  const scale = Math.min(w / tmp.width, h / tmp.height)
  const dw = tmp.width * scale
  const dh = tmp.height * scale
  ctx.drawImage(tmp, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

export function renderLabelToCanvas(
  items: LabelItem[],
  settings: LabelSettings,
): HTMLCanvasElement {
  const W = mm(settings.widthMm)
  const H = mm(settings.heightMm)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#000'

  const pad = mm(2)
  const innerW = W - pad * 2
  const availH = H - pad * 2
  const gap = mm(1.2)

  const rends = buildRends(items)

  // подбираем самый крупный размер шрифта, при котором всё помещается
  const maxPx = Math.round((settings.fontSize * DPI) / 72)
  const minPx = Math.max(8, Math.round(maxPx * 0.45))
  let chosen = layoutAt(ctx, rends, maxPx, innerW, availH, gap)
  let fontPx = maxPx
  for (let px = maxPx; px >= minPx; px -= 1) {
    const l = layoutAt(ctx, rends, px, innerW, availH, gap)
    chosen = l
    fontPx = px
    if (l.fits) break
  }

  const lineH = Math.round(fontPx * 1.25)
  let y = pad
  for (const p of chosen.prepared) {
    if (p.kind === 'text') {
      ctx.font = `${fontPx}px Arial, sans-serif`
      ctx.fillStyle = '#000'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      for (const line of p.lines ?? []) {
        ctx.fillText(line, W / 2, y)
        y += lineH
      }
    } else {
      drawBarcode(ctx, p.value ?? '', settings, pad, y, innerW, p.h)
      y += p.h
    }
    y += gap
  }

  return canvas
}
