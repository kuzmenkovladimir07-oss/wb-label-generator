import { LABEL_FONT_TTF_BASE64 } from './font'

/** Имя семейства для canvas-предпросмотра (тот же шрифт, что встраивается в PDF). */
export const LABEL_FONT_FAMILY = 'WBLabelFont'

let loading: Promise<void> | null = null

/**
 * Один раз подгружает встроенный шрифт как FontFace, чтобы canvas-предпросмотр
 * мерил и рисовал текст тем же шрифтом, что и PDF (полный WYSIWYG).
 */
export function ensureLabelFont(): Promise<void> {
  if (loading) return loading
  loading = (async () => {
    if (typeof FontFace === 'undefined' || typeof document === 'undefined') return
    try {
      const face = new FontFace(
        LABEL_FONT_FAMILY,
        `url(data:font/ttf;base64,${LABEL_FONT_TTF_BASE64})`,
      )
      await face.load()
      document.fonts.add(face)
    } catch {
      // если не удалось — предпросмотр откатится на системный шрифт
    }
  })()
  return loading
}
