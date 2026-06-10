import { useMemo, useState } from 'react'
import type { Row, LabelSettings } from './types'
import { PRESETS } from './types'
import ProductTable from './components/ProductTable'
import LabelSettingsPanel from './components/LabelSettings'
import LabelPreview from './components/LabelPreview'
import { generatePdf, isPrintable } from './lib/generatePdf'

let idCounter = 0
const newId = () => `row-${++idCounter}`

const emptyRow = (): Row => ({ id: newId(), barcode: '', name: '', article: '' })

const initialRows: Row[] = [
  { id: newId(), barcode: '2003421249001', name: 'Футболка хлопок, чёрная', article: 'А1301' },
  { id: newId(), barcode: '2014241011006', name: 'Худи оверсайз, серое', article: 'А1402' },
  { id: newId(), barcode: '2014240965003', name: 'Носки набор 5 пар', article: 'А1503' },
]

const initialSettings: LabelSettings = {
  preset: '58x40',
  ...PRESETS['58x40'],
  fontSize: 9,
  format: 'EAN13',
}

export default function App() {
  const [rows, setRows] = useState<Row[]>(initialRows)
  const [settings, setSettings] = useState<LabelSettings>(initialSettings)

  const updateCell = (id: string, field: keyof Omit<Row, 'id'>, value: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)))

  const addRow = () => setRows((rs) => [...rs, emptyRow()])

  const removeRow = (id: string) =>
    setRows((rs) => {
      const next = rs.filter((r) => r.id !== id)
      return next.length ? next : [emptyRow()]
    })

  const clearTable = () => setRows([emptyRow()])

  const patchSettings = (patch: Partial<LabelSettings>) =>
    setSettings((s) => ({ ...s, ...patch }))

  const printableCount = useMemo(() => rows.filter(isPrintable).length, [rows])
  const previewRow = useMemo(() => rows.find(isPrintable), [rows])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Генератор этикеток для Wildberries</h1>
        <p className="subtitle">Штрих-код · Название · Артикул → готовый PDF для печати</p>
      </header>

      <main className="layout">
        <div className="col-main">
          <ProductTable
            rows={rows}
            onChange={updateCell}
            onAdd={addRow}
            onRemove={removeRow}
            onClear={clearTable}
          />
          <LabelSettingsPanel settings={settings} onChange={patchSettings} />

          <div className="generate-bar">
            <button
              type="button"
              className="btn primary"
              onClick={() => generatePdf(rows, settings)}
              disabled={printableCount === 0}
            >
              Скачать PDF ↓
            </button>
            <span className="count">
              {printableCount > 0
                ? `Этикеток в PDF: ${printableCount}`
                : 'Заполните хотя бы одну строку'}
            </span>
          </div>
        </div>

        <aside className="col-side">
          <LabelPreview row={previewRow} settings={settings} />
        </aside>
      </main>

      <footer className="app-footer">
        Этикетки генерируются прямо в браузере — данные никуда не отправляются.
      </footer>
    </div>
  )
}
