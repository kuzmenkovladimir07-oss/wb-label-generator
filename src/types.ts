export type ItemKind = 'barcode' | 'text'

/**
 * Этикетка — это упорядоченный список полей. Порядок в списке = порядок строк
 * сверху вниз на самой этикетке. Ровно одно поле имеет kind='barcode' и рисуется
 * как штрих-код; остальные — текстовые строки.
 */
export interface LabelItem {
  id: string
  kind: ItemKind
  /** Название поля (для текстовых — редактируется, напр. «Цвет»). */
  name: string
  /** Значение поля (для штрих-кода — кодируемое значение). */
  value: string
  /** Показывать ли «Название: значение» вместо просто «значение» (только текст). */
  showName: boolean
}

export type SizePreset = '43x25' | '58x40' | 'custom'

export type BarcodeFormat = 'EAN13' | 'CODE128'

export interface LabelSettings {
  preset: SizePreset
  widthMm: number
  heightMm: number
  fontSize: number
  format: BarcodeFormat
  /** Сколько одинаковых копий этикетки положить в PDF. */
  copies: number
}

export const PRESETS: Record<Exclude<SizePreset, 'custom'>, { widthMm: number; heightMm: number }> = {
  '43x25': { widthMm: 43, heightMm: 25 },
  '58x40': { widthMm: 58, heightMm: 40 },
}
