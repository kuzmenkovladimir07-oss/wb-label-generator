import { useEffect, useRef } from 'react'
import type { Row, LabelSettings } from '../types'
import { renderLabelToCanvas } from '../lib/renderLabel'

interface Props {
  row: Row | undefined
  settings: LabelSettings
}

export default function LabelPreview({ row, settings }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = ''
    if (!row) return

    const canvas = renderLabelToCanvas(row, settings)
    // показываем в реальной пропорции, но ограничиваем по ширине контейнера
    canvas.style.width = '100%'
    canvas.style.height = 'auto'
    canvas.style.maxWidth = `${settings.widthMm * 5}px`
    host.appendChild(canvas)
  }, [row, settings])

  return (
    <section className="card preview">
      <h2>Предпросмотр</h2>
      {row ? (
        <>
          <div className="preview-host" ref={hostRef} />
          <p className="sub-hint">
            Размер: {settings.widthMm} × {settings.heightMm} мм. Показана первая строка таблицы.
          </p>
        </>
      ) : (
        <p className="hint">Добавьте строку в таблицу, чтобы увидеть этикетку.</p>
      )}
    </section>
  )
}
