export type CSVCell = string | number | null | undefined

/** Separatore ";" e virgola decimale: si apre direttamente in Excel/Numbers italiani. */
export const CSV_SEPARATOR = ';'

function formatCell(value: CSVCell, sep: string): string {
  if (value == null) return ''
  let text =
    typeof value === 'number'
      ? new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2, useGrouping: false }).format(value)
      : value
  // Evita che un testo venga interpretato come formula dal foglio di calcolo.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (text.includes(sep) || text.includes('"') || /[\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toCSV(rows: CSVCell[][], sep = CSV_SEPARATOR): string {
  return rows.map((row) => row.map((c) => formatCell(c, sep)).join(sep)).join('\r\n')
}
