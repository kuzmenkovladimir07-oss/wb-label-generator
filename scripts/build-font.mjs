// Генерирует src/lib/font.ts: берёт DejaVu Sans (из npm-пакета dejavu-fonts-ttf),
// субсеттит до нужных символов (латиница, цифры, кириллица, пунктуация) и
// сохраняет как base64. Это даёт компактный шрифт для ВЕКТОРНОГО текста в PDF.
// Запускается автоматически перед dev/build (см. package.json), поэтому
// сгенерированный src/lib/font.ts в репозиторий не коммитится.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import subsetFont from 'subset-font'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const srcFont = resolve(root, 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf')
const outFile = resolve(root, 'src/lib/font.ts')

// набор символов: печатная латиница, цифры, русская кириллица и пунктуация этикеток
const latin = Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i)).join('')
const cyr = 'ЁАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюяё'
const punct = '№°×–—«»…₽ '
const chars = latin + cyr + punct

if (!existsSync(srcFont)) {
  console.error('Не найден исходный шрифт:', srcFont, '\nУстановите зависимости: npm install')
  process.exit(1)
}

const subset = await subsetFont(readFileSync(srcFont), chars, { targetFormat: 'truetype' })
const b64 = subset.toString('base64')

const content = `// АВТОСГЕНЕРИРОВАНО scripts/build-font.mjs — не редактировать вручную.
// DejaVu Sans (подмножество). Лицензия Bitstream Vera / DejaVu (свободная).
// Встраивается в PDF, чтобы текст был ВЕКТОРНЫМ и поддерживал кириллицу.
export const LABEL_FONT_TTF_BASE64 = '${b64}'
`

writeFileSync(outFile, content)
console.log(`Сгенерирован ${outFile}: subset ${subset.length} байт, base64 ${b64.length} символов`)
