/**
 * Crea il PDF del diario a partire da un ReportDocument. jsPDF viene caricato
 * solo quando serve (import dinamico), così non pesa sull'avvio dell'app.
 */
import type { ReportDaySection, ReportDocument } from './report-document'

const REPLACEMENTS: [RegExp, string][] = [
  [/[\u201A\u2032]/g, "'"],
  [/[\u201E\u2033]/g, '"'],
  [/\u2212/g, '-'],
  [/\u00A0/g, ' '],
]

/**
 * I font standard del PDF (Helvetica, codifica WinAnsi) coprono l'alfabeto
 * latino con le lettere accentate e la punteggiatura tipografica più comune
 * (– — ‘ ’ “ ” … • €). Il resto (es. emoji) viene tolto, altrimenti
 * comparirebbe come simboli illeggibili.
 */
export function pdfText(text: string): string {
  let out = text.normalize('NFC')
  for (const [re, sub] of REPLACEMENTS) out = out.replace(re, sub)
  return out
    .replace(/[^\t\n\r\x20-\x7E\xA1-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u2022\u20AC]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;:!?])/g, '$1')
    .trim()
}

type RGB = [number, number, number]

const MARGIN = 14
const FOOTER = 12
const INK: RGB = [23, 23, 23]
const MUTED: RGB = [105, 105, 105]
// Colori scuri: leggibili anche stampati e con contrasto ≥ 4,5:1 sul bianco.
const OK: RGB = [10, 120, 70]
const WARN: RGB = [170, 85, 0]
const LINE: RGB = [220, 220, 220]
const PT = 0.3528 // millimetri per punto tipografico
const TABLE_FONT = 9
const CELL_PAD = 1.4
const COLS = { time: 13, meal: 29, quantity: 24, note: 45 }

/** Restituisce il PDF come byte, pronto per un File da condividere. */
export async function renderReportPdf(doc: ReportDocument): Promise<ArrayBuffer> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const width = pageW - MARGIN * 2
  const bottom = pageH - FOOTER - 4
  const foodCol = width - COLS.time - COLS.meal - COLS.quantity - COLS.note
  let y = MARGIN
  /** Titolo da ripetere se il contenuto continua sulla pagina dopo. */
  let continuing: string | null = null

  pdf.setProperties({
    title: pdfText(`${doc.title} – ${doc.period}`),
    subject: 'Diario alimentare e dei sintomi',
    creator: 'Diario FODMAP',
  })

  const lineHeight = (size: number) => size * PT * 1.25

  const continuationTitle = (title: string) => {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(...MUTED)
    pdf.text(pdfText(`${title} (continua)`), MARGIN, MARGIN + 4)
  }

  const ensure = (height: number) => {
    if (y + height <= bottom) return
    pdf.addPage()
    y = MARGIN
    if (continuing) {
      continuationTitle(continuing)
      y = MARGIN + 7
    }
  }

  type TextOpts = { size?: number; bold?: boolean; color?: RGB; indent?: number; gap?: number }

  const wrap = (value: string, size: number, bold: boolean, indent: number): string[] => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(size)
    return pdf.splitTextToSize(pdfText(value), width - indent)
  }

  /** Altezza che occuperà un testo (stessa logica di text()). */
  const textHeight = (value: string, { size = 10, bold = false, indent = 0, gap = 1.2 }: TextOpts = {}) =>
    wrap(value, size, bold, indent).length * lineHeight(size) + gap

  const text = (value: string, { size = 10, bold = false, color = INK, indent = 0, gap = 1.2 }: TextOpts = {}) => {
    const lines = wrap(value, size, bold, indent)
    for (const line of lines) {
      ensure(lineHeight(size))
      pdf.setFont('helvetica', bold ? 'bold' : 'normal')
      pdf.setFontSize(size)
      pdf.setTextColor(...color)
      pdf.text(line, MARGIN + indent, y + lineHeight(size) * 0.8)
      y += lineHeight(size)
    }
    y += gap
  }

  /** Titolo di sezione: va a pagina nuova insieme ad almeno `keepWith` mm di contenuto. */
  const heading = (value: string, size = 12, keepWith = 12) => {
    ensure(size * 0.6 + keepWith)
    y += 2
    text(value, { size, bold: true, gap: 1.5 })
  }

  /** Stima dell'altezza di un giorno, per non spezzarlo se sta in una pagina. */
  const dayHeight = (day: ReportDaySection): number => {
    let h = 4 + textHeight(day.title, { size: 11.5, bold: true, gap: 1 })
    if (day.empty) return h + textHeight('Nessun dato registrato.', { size: 9.5 })
    if (day.rows.length) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(TABLE_FONT)
      const rowH = (cells: [string, number][]) =>
        Math.max(...cells.map(([t, w]) => pdf.splitTextToSize(pdfText(t), w - CELL_PAD * 2).length)) *
          TABLE_FONT *
          PT *
          1.15 +
        CELL_PAD * 2
      h += rowH([['Ora', COLS.time]])
      for (const r of day.rows) {
        h += rowH([
          [r.meal, COLS.meal],
          [r.flag ? `${r.food}\n(${r.flag})` : r.food, foodCol],
          [r.quantity, COLS.quantity],
          [r.note, COLS.note],
        ])
      }
      h += 2.5
    }
    if (day.noSymptoms) h += textHeight('Nessun sintomo.', { size: 9.5, bold: true })
    if (day.symptoms.length) {
      h += textHeight(day.symptomsTitle, { size: 9.5, bold: true, gap: 0.6 })
      for (const s of day.symptoms) h += textHeight(`• ${s}`, { size: 9.5, indent: 2, gap: 0.4 })
      h += 0.8
    }
    if (day.supplements.length) h += textHeight(`Integratori: ${day.supplements.join(', ')}`, { size: 9.5 })
    if (day.note) h += textHeight(`Note: ${day.note}`, { size: 9.5 })
    return h
  }

  // Intestazione
  text(doc.title, { size: 17, bold: true, gap: 1 })
  text(doc.period, { size: 12, gap: 1.5 })
  for (const m of doc.meta) text(m, { size: 9, color: MUTED, gap: 0.5 })
  y += 3

  // Riepilogo del periodo
  if (doc.summary.length) {
    heading('Riepilogo del periodo', 12, doc.summary.length * 5)
    autoTable(pdf, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, bottom: FOOTER + 4 },
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: { top: 1, bottom: 1, left: 0, right: 2 }, textColor: INK },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
      body: doc.summary.map((s) => [pdfText(s.label), pdfText(s.value)]),
    })
    y = lastY(pdf) + 4
  }

  // Limiti del piano, una tabella per settimana (esito scritto, non solo colorato)
  if (doc.weeks.length) {
    heading('Limiti del piano', 12, 10 + doc.weeks[0].lines.length * 6)
    for (const week of doc.weeks) {
      ensure(12 + week.lines.length * 6)
      text(week.title, { size: 10.5, bold: true, gap: 0.6 })
      if (week.note) text(week.note, { size: 8.5, color: MUTED, gap: 0.8 })
      autoTable(pdf, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN, bottom: FOOTER + 4, top: MARGIN + 7 },
        theme: 'plain',
        rowPageBreak: 'avoid',
        styles: { font: 'helvetica', fontSize: 9.5, cellPadding: { top: 0.9, bottom: 0.9, left: 0, right: 2 }, textColor: INK },
        columnStyles: { 0: { cellWidth: 22, fontStyle: 'bold' }, 1: { fontStyle: 'bold', cellWidth: 46 } },
        body: week.lines.map((l) => [l.ok ? 'OK' : 'Da rivedere', pdfText(l.label), pdfText(l.detail)]),
        didParseCell: (hook) => {
          if (hook.section === 'body' && hook.column.index === 0) {
            hook.cell.styles.textColor = week.lines[hook.row.index].ok ? OK : WARN
          }
        },
        didDrawPage: (hook) => {
          if (hook.pageNumber > 1) continuationTitle(week.title)
        },
      })
      y = lastY(pdf) + 3
    }
  }

  // Giorno per giorno: se un giorno sta in una pagina, non lo si spezza
  for (const day of doc.days) {
    const height = dayHeight(day)
    ensure(height <= bottom - MARGIN ? height : 30)
    y += 2
    pdf.setDrawColor(...LINE)
    pdf.line(MARGIN, y, pageW - MARGIN, y)
    y += 2
    text(day.title, { size: 11.5, bold: true, gap: 1 })

    if (day.empty) {
      text('Nessun dato registrato.', { size: 9.5, color: MUTED })
      continue
    }
    continuing = day.title

    if (day.rows.length) {
      autoTable(pdf, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN, bottom: FOOTER + 4, top: MARGIN + 7 },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: TABLE_FONT,
          cellPadding: CELL_PAD,
          textColor: INK,
          lineColor: LINE,
          lineWidth: 0.2,
          overflow: 'linebreak',
          valign: 'top',
        },
        headStyles: { fillColor: [244, 244, 244], textColor: INK, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: COLS.time },
          1: { cellWidth: COLS.meal },
          3: { cellWidth: COLS.quantity },
          4: { cellWidth: COLS.note },
        },
        head: [['Ora', 'Pasto', 'Alimento', 'Quantità', 'Note']],
        body: day.rows.map((r) => [
          r.time,
          pdfText(r.meal),
          pdfText(r.flag ? `${r.food}\n(${r.flag})` : r.food),
          pdfText(r.quantity),
          pdfText(r.note),
        ]),
        didParseCell: (hook) => {
          if (hook.section === 'body' && hook.column.index === 2 && day.rows[hook.row.index]?.flag) {
            hook.cell.styles.textColor = WARN
          }
        },
        // Giorno troppo lungo per una pagina: sulla pagina nuova ripete il titolo.
        didDrawPage: (hook) => {
          if (hook.pageNumber > 1) continuationTitle(day.title)
        },
      })
      y = lastY(pdf) + 2.5
    }

    if (day.noSymptoms) text('Nessun sintomo.', { size: 9.5, bold: true, color: OK })
    if (day.symptoms.length) {
      text(day.symptomsTitle, { size: 9.5, bold: true, gap: 0.6 })
      for (const s of day.symptoms) text(`• ${s}`, { size: 9.5, indent: 2, gap: 0.4 })
      y += 0.8
    }
    if (day.supplements.length) text(`Integratori: ${day.supplements.join(', ')}`, { size: 9.5 })
    if (day.note) text(`Note: ${day.note}`, { size: 9.5 })
    continuing = null
  }

  // Piè di pagina su ogni pagina
  const pages = pdf.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...MUTED)
    pdf.text(pdfText(`Diario alimentare – ${doc.period}`), MARGIN, pageH - 7)
    pdf.text(`Pagina ${i} di ${pages}`, pageW - MARGIN, pageH - 7, { align: 'right' })
  }

  return pdf.output('arraybuffer')
}

function lastY(pdf: unknown): number {
  return (pdf as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? MARGIN
}
