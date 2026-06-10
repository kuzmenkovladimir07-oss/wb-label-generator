import { useEffect, useRef } from 'react'
import type { LabelItem, LabelSettings } from '../types'
import { renderLabelToCanvas } from '../lib/renderLabel'
import { ensureLabelFont } from '../lib/labelFont'

interface Props {
  items: LabelItem[]
  settings: LabelSettings
}

export default function LabelPreview({ items, settings }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    const render = () => {
      const host = hostRef.current
      if (!host || cancelled) return
      host.innerHTML = ''
      const canvas = renderLabelToCanvas(items, settings)
      canvas.style.width = '100%'
      canvas.style.height = 'auto'
      canvas.style.maxWidth = `${settings.widthMm * 5}px`
      host.appendChild(canvas)
    }

    // ждём встроенный шрифт, чтобы предпросмотр совпадал с PDF
    ensureLabelFont().then(render)

    return () => {
      cancelled = true
    }
  }, [items, settings])

  return (
    <section className="card preview">
      <h2>Предпросмотр</h2>
      <div className="preview-host" ref={hostRef} />
      <p className="sub-hint">
        Размер: {settings.widthMm} × {settings.heightMm} мм. Векторный PDF — не пикселит при увеличении.
      </p>
    </section>
  )
}
