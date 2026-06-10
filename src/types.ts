export interface Row {
  id: string
  barcode: string
  name: string
  article: string
}

export type SizePreset = '43x25' | '58x40' | 'custom'

export type BarcodeFormat = 'EAN13' | 'CODE128'

export interface LabelSettings {
  preset: SizePreset
  widthMm: number
  heightMm: number
  fontSize: number
  format: BarcodeFormat
}

export const PRESETS: Record<Exclude<SizePreset, 'custom'>, { widthMm: number; heightMm: number }> = {
  '43x25': { widthMm: 43, heightMm: 25 },
  '58x40': { widthMm: 58, heightMm: 40 },
}
