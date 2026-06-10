import type { LabelItem } from '../types'

interface Props {
  items: LabelItem[]
  onChange: (id: string, patch: Partial<LabelItem>) => void
  onAddField: () => void
  onRemove: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
}

export default function FieldEditor({ items, onChange, onAddField, onRemove, onMove }: Props) {
  return (
    <section className="card">
      <p className="hint">
        Соберите этикетку из полей — каждое поле это строка сверху вниз. «Штрих-код» рисуется
        как код, остальные поля — текст. Порядок полей = порядок на этикетке.
      </p>

      <ul className="field-list">
        {items.map((it, i) => (
          <li key={it.id} className={`field-row ${it.kind}`}>
            <div className="field-move">
              <button
                type="button"
                className="icon-btn"
                disabled={i === 0}
                onClick={() => onMove(it.id, -1)}
                title="Поднять выше"
                aria-label="Поднять выше"
              >
                ↑
              </button>
              <button
                type="button"
                className="icon-btn"
                disabled={i === items.length - 1}
                onClick={() => onMove(it.id, 1)}
                title="Опустить ниже"
                aria-label="Опустить ниже"
              >
                ↓
              </button>
            </div>

            {it.kind === 'barcode' ? (
              <div className="field-main">
                <span className="field-badge">Штрих-код</span>
                <input
                  className="field-value"
                  value={it.value}
                  onChange={(e) => onChange(it.id, { value: e.target.value })}
                  placeholder="2003421249001"
                  inputMode="numeric"
                />
              </div>
            ) : (
              <div className="field-main">
                <input
                  className="field-name"
                  value={it.name}
                  onChange={(e) => onChange(it.id, { name: e.target.value })}
                  placeholder="Название поля (напр. Цвет)"
                />
                <input
                  className="field-value"
                  value={it.value}
                  onChange={(e) => onChange(it.id, { value: e.target.value })}
                  placeholder="Значение (напр. чёрный)"
                />
                <label className="field-toggle" title="Показывать название поля на этикетке">
                  <input
                    type="checkbox"
                    checked={it.showName}
                    onChange={(e) => onChange(it.id, { showName: e.target.checked })}
                  />
                  <span>показывать название</span>
                </label>
              </div>
            )}

            <div className="field-del">
              {it.kind === 'text' && (
                <button
                  type="button"
                  className="icon-btn remove"
                  onClick={() => onRemove(it.id)}
                  title="Удалить поле"
                  aria-label="Удалить поле"
                >
                  –
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="table-actions">
        <button type="button" className="btn" onClick={onAddField}>
          + Добавить поле
        </button>
      </div>
    </section>
  )
}
