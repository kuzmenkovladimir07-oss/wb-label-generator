import type { LabelSettings, SizePreset, BarcodeFormat } from '../types'
import { PRESETS } from '../types'

interface Props {
  settings: LabelSettings
  onChange: (patch: Partial<LabelSettings>) => void
}

export default function LabelSettingsPanel({ settings, onChange }: Props) {
  const setPreset = (preset: SizePreset) => {
    if (preset === 'custom') {
      onChange({ preset })
    } else {
      onChange({ preset, ...PRESETS[preset] })
    }
  }

  return (
    <section className="card settings">
      <h2>Настройки этикетки</h2>

      <div className="field">
        <label>Размер этикетки</label>
        <div className="preset-row">
          <button
            type="button"
            className={`chip ${settings.preset === '43x25' ? 'active' : ''}`}
            onClick={() => setPreset('43x25')}
          >
            43 × 25 мм
          </button>
          <button
            type="button"
            className={`chip ${settings.preset === '58x40' ? 'active' : ''}`}
            onClick={() => setPreset('58x40')}
          >
            58 × 40 мм
          </button>
          <button
            type="button"
            className={`chip ${settings.preset === 'custom' ? 'active' : ''}`}
            onClick={() => setPreset('custom')}
          >
            Свой
          </button>
        </div>
      </div>

      {settings.preset === 'custom' && (
        <div className="field custom-size">
          <div>
            <label>Ширина, мм</label>
            <input
              type="number"
              min={10}
              max={200}
              value={settings.widthMm}
              onChange={(e) => onChange({ widthMm: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label>Высота, мм</label>
            <input
              type="number"
              min={10}
              max={200}
              value={settings.heightMm}
              onChange={(e) => onChange({ heightMm: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
      )}

      <div className="field">
        <label>Формат штрих-кода</label>
        <select
          value={settings.format}
          onChange={(e) => onChange({ format: e.target.value as BarcodeFormat })}
        >
          <option value="EAN13">EAN-13 (стандарт WB, 12–13 цифр)</option>
          <option value="CODE128">Code-128 (буквы и цифры)</option>
        </select>
        {settings.format === 'EAN13' && (
          <p className="sub-hint">
            Если в значении не 12–13 цифр, штрих-код автоматически нарисуется в Code-128.
          </p>
        )}
      </div>

      <div className="field custom-size">
        <div>
          <label>Размер шрифта</label>
          <input
            type="number"
            min={4}
            max={20}
            value={settings.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) || 6 })}
          />
        </div>
        <div>
          <label>Копий в PDF</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={settings.copies}
            onChange={(e) => onChange({ copies: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
      </div>
    </section>
  )
}
