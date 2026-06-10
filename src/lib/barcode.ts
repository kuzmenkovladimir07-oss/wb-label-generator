import JsBarcode from 'jsbarcode'
import type { BarcodeFormat } from '../types'

/** EAN-13 валиден только из 12–13 цифр (13-й — контрольный, можно досчитать). */
export function isValidEan13(value: string): boolean {
  return /^\d{12,13}$/.test(value.trim())
}

/** EAN-13 если значение валидно, иначе Code-128 (буквы/произвольная длина). */
export function resolveFormat(value: string, want: BarcodeFormat): 'EAN13' | 'CODE128' {
  return want === 'EAN13' && isValidEan13(value) ? 'EAN13' : 'CODE128'
}

function ean13Check(d12: string): string {
  let sum = 0
  for (let i = 0; i < 12; i += 1) sum += Number(d12[i]) * (i % 2 === 0 ? 1 : 3)
  return ((10 - (sum % 10)) % 10).toString()
}

/** Человекочитаемые цифры под кодом: для EAN-13 — со стандартной группировкой. */
export function displayDigits(value: string, fmt: 'EAN13' | 'CODE128'): string {
  if (fmt === 'EAN13') {
    let s = value.replace(/\D/g, '')
    if (s.length === 12) s += ean13Check(s)
    if (s.length === 13) return `${s[0]} ${s.slice(1, 7)} ${s.slice(7)}`
  }
  return value.trim()
}

export interface Bar {
  /** левый край штриха в долях полной ширины [0..1] */
  x: number
  /** ширина штриха в долях полной ширины [0..1] */
  w: number
}

/**
 * Считаем геометрию штрихов через JsBarcode (рисует во временный SVG),
 * возвращаем штрихи в долях ширины — это позволяет рисовать их как
 * векторные прямоугольники любого размера (и в canvas, и в PDF).
 * Все штрихи одной высоты (displayValue: false), цифры рисуем отдельно.
 */
export function barcodeBars(value: string, fmt: 'EAN13' | 'CODE128'): Bar[] | null {
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  try {
    JsBarcode(svg, value.trim(), {
      format: fmt,
      displayValue: false,
      margin: 0,
      width: 1,
      height: 100,
      background: '#ffffff',
      lineColor: '#000000',
    })
  } catch {
    return null
  }

  const totalW = parseFloat(svg.getAttribute('width') || '0')
  if (!totalW) return null

  // EAN-13 рисуется группами <g transform="translate(tx,0)">, поэтому x штриха
  // нужно складывать со смещениями всех родительских групп.
  const absoluteX = (rect: Element): number => {
    let x = parseFloat(rect.getAttribute('x') || '0')
    let node: Node | null = rect.parentNode
    while (node && node !== svg) {
      const t = (node as Element).getAttribute?.('transform')
      if (t) {
        const m = /translate\(\s*([-\d.]+)/.exec(t)
        if (m) x += parseFloat(m[1])
      }
      node = node.parentNode
    }
    return x
  }

  const bars: Bar[] = []
  svg.querySelectorAll('rect').forEach((r) => {
    const fill = (r.getAttribute('fill') || '').toLowerCase()
    if (fill === '#ffffff' || fill === 'white') return // фон, не штрих
    const w = parseFloat(r.getAttribute('width') || '0')
    if (w <= 0 || w >= totalW * 0.95) return // фон во всю ширину
    bars.push({ x: absoluteX(r) / totalW, w: w / totalW })
  })

  return bars.length ? bars : null
}
