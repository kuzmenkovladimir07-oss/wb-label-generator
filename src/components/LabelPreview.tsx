import { useEffect, useRef } from 'react'
import type { LabelItem, LabelSettings } from '../types'
import { renderLabelToCanvas } from '../lib/renderLabel'

interface Props {
  items: LabelItem[]
  settings: LabelSettings
}

export default function LabelPreview({ items, settings }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = ''

    const canvas = renderLabelToCanvas(items, settings)
    // показываем в реальной пропорции, но ограничиваем по ширине контейнера
    canvas.style.width = '100%'
    canvas.style.height = 'auto'
    canvas.style.maxWidth = `${settings.widthMm * 5}px`
    host.appendChild(canvas)
  }, [items, settings])

  return (
    <section className="card preview">
      <h2>Предпросмотр</h2>
      <div className="preview-host" ref={hostRef} />
      <p className="sub-hint">
        Размер: {settings.widthMm} × {settings.heightMm} мм.
      </p>
    </section>
  )
}
