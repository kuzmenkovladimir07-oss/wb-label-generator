import JsBarcode from 'jsbarcode'
import type { Row, LabelSettings } from '../types'

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

/** Подбираем px-шрифт так, чтобы текст уложился в maxLines строк по ширине maxW. */
function wrapToLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  font: (px: number) => string,
  basePx: number,
  maxLines: number,
): { lines: string[]; px: number } {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return { lines: [], px: basePx }

  for (let px = basePx; px >= Math.round(basePx * 0.55); px -= 1) {
    ctx.font = font(px)
    const lines: string[] = []
    let current = ''
    let overflow = false
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (ctx.measureText(candidate).width <= maxW) {
        current = candidate
      } else {
        if (current) lines.push(current)
        current = word
        // одно слово шире строки — на этом размере не помещается
        if (ctx.measureText(current).width > maxW) {
          overflow = true
          break
        }
      }
    }
    if (current) lines.push(current)
    if (!overflow && lines.length <= maxLines) return { lines, px }
  }

  // не уместилось даже на минимальном размере — обрезаем с многоточием
  const px = Math.round(basePx * 0.55)
  ctx.font = font(px)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxW) {
      current = candidate
    } else {
      if (lines.length >= maxLines - 1) break
      if (current) lines.push(current)
      current = word
    }
  }
  if (current && lines.length < maxLines) lines.push(current)
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1]
    while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1)
    lines[maxLines - 1] = last + '…'
  }
  return { lines, px }
}

/** Текст в одну строку: ужимаем шрифт, чтобы влезло по ширине. */
function fitOneLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  font: (px: number) => string,
  basePx: number,
): number {
  for (let px = basePx; px >= Math.round(basePx * 0.5); px -= 1) {
    ctx.font = font(px)
    if (ctx.measureText(text).width <= maxW) return px
  }
  return Math.round(basePx * 0.5)
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

export function renderLabelToCanvas(row: Row, settings: LabelSettings): HTMLCanvasElement {
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
  // размер шрифта трактуем как пункты (pt) при печати и переводим в пиксели 300 dpi
  const basePx = Math.round((settings.fontSize * DPI) / 72)

  const boldFont = (px: number) => `bold ${px}px Arial, sans-serif`
  const regFont = (px: number) => `${px}px Arial, sans-serif`

  // --- Название (сверху, до 2 строк) ---
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const name = row.name.trim()
  const { lines, px: namePx } = wrapToLines(ctx, name, innerW, boldFont, basePx, 2)
  ctx.font = boldFont(namePx)
  const lineH = Math.round(namePx * 1.2)
  let y = pad
  for (const line of lines) {
    ctx.fillText(line, W / 2, y)
    y += lineH
  }
  const nameBottom = lines.length ? y : pad

  // --- Артикул (снизу) ---
  const article = row.article.trim()
  let articleTop = H - pad
  if (article) {
    const aPx = fitOneLine(ctx, article, innerW, regFont, basePx)
    ctx.font = regFont(aPx)
    ctx.textBaseline = 'bottom'
    ctx.fillText(article, W / 2, H - pad)
    articleTop = H - pad - aPx * 1.2
  }

  // --- Штрих-код (по центру, заполняет оставшееся место) ---
  const bcTop = nameBottom + mm(1)
  const bcBottom = articleTop - mm(1)
  const bcAreaH = Math.max(bcBottom - bcTop, mm(6))
  drawBarcode(ctx, row.barcode, settings, pad, bcTop, innerW, bcAreaH)

  return canvas
}
