/**
 * Crea il PDF del diario a partire da un ReportDocument. jsPDF viene caricato
 * solo quando serve (import dinamico), così non pesa sull'avvio dell'app.
 */
import type { ReportDocument } from './report-document'

const REPLACEMENTS: [RegExp, string][] = [
  [/[\u2018\u2019\u201A\u2032]/g, "'"],
  [/[\u201C\u201D\u201E\u2033]/g, '"'],
  [/[\u2013\u2014\u2212]/g, '-'],
  [/\u2026/g, '...'],
  [/\u2022/g, '-'],
  [/\u20AC/g, 'EUR'],
  [/\u00A0/g, ' '],
]

/**
 * I font standard del PDF coprono solo l'alfabeto latino (Latin-1, lettere
 * accentate comprese): converte la punteggiatura tipografica e toglie il resto
 * (es. emoji), che altrimenti comparirebbe come simboli illeggibili.
 */
export function pdfText(text: string): string {
  let out = text.normalize('NFC')
  for (const [re, sub] of REPLACEMENTS) out = out.replace(re, sub)
  return out
    .replace(/[^\t\n\r\x20-\x7E\xA1-\xFF]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;:!?])/g, '$1')
    .trim()
}

const MARGIN = 14
const FOOTER = 12
const INK: [number, number, number] = [23, 23, 23]
const MUTED: [number, number, number] = [110, 110, 110]
const OK: [number, number, number] = [16, 140, 85]
const WARN: [number, number, number] = [200, 110, 0]
const LINE: [number, number, number] = [220, 220, 220]

/** Restituisce il PDF come byte, pronto per un File da condividere. */
export async function renderReportPdf(doc: ReportDocument): Promise<ArrayBuffer> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const width = pageW - MARGIN * 2
  let y = MARGIN

  pdf.setProperties({
    title: pdfText(`${doc.title} - ${doc.period}`),
    subject: 'Diario alimentare e dei sintomi',
    creator: 'Diario FODMAP',
  })

  const ensure = (height: number) => {
    if (y + height > pageH - FOOTER - 4) {
      pdf.addPage()
      y = MARGIN
    }
  }

  const text = (
    value: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = {},
  ) => {
    const { size = 10, bold = false, color = INK, indent = 0, gap = 1.2 } = opts
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(size)
    pdf.setTextColor(...color)
    const lines: string[] = pdf.splitTextToSize(pdfText(value), width - indent)
    const lineH = size * 0.3528 * 1.25
    for (const line of lines) {
      ensure(lineH)
      pdf.text(line, MARGIN + indent, y + lineH * 0.8)
      y += lineH
    }
    y += gap
  }

  const heading = (value: string, size = 12) => {
    ensure(size * 0.6 + 12)
    y += 2
    text(value, { size, bold: true, gap: 1.5 })
  }

  // Intestazione
  text(doc.title, { size: 17, bold: true, gap: 1 })
  text(doc.period, { size: 12, gap: 1.5 })
  for (const m of doc.meta) text(m, { size: 9, color: MUTED, gap: 0.5 })
  y += 3

  // Riepilogo del periodo
  if (doc.summary.length) {
    heading('Riepilogo del periodo')
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

  // Aderenza ai limiti, una sezione per settimana (pallino verde = rispettato)
  for (const week of doc.weeks) {
    heading(`Limiti del piano · ${week.title}`, 11)
    if (!week.lines.length) {
      text('Nessun alimento registrato in questa settimana.', { size: 9.5, color: MUTED, gap: 3 })
      continue
    }
    autoTable(pdf, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, bottom: FOOTER + 4 },
      theme: 'plain',
      rowPageBreak: 'avoid',
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: { top: 0.9, bottom: 0.9, left: 0, right: 2 }, textColor: INK },
      columnStyles: { 0: { cellWidth: 5 }, 1: { fontStyle: 'bold', cellWidth: 50 } },
      body: week.lines.map((l) => ['', pdfText(l.label), pdfText(l.detail)]),
      didDrawCell: (hook) => {
        if (hook.section !== 'body' || hook.column.index !== 0) return
        pdf.setFillColor(...(week.lines[hook.row.index].ok ? OK : WARN))
        pdf.circle(hook.cell.x + 1.3, hook.cell.y + hook.cell.height / 2, 1.1, 'F')
      },
    })
    y = lastY(pdf) + 3
  }

  // Giorno per giorno: se un giorno sta in una pagina, non lo si spezza
  const pageContent = pageH - FOOTER - 4 - MARGIN
  for (const day of doc.days) {
    const estimate =
      12 + (day.rows.length ? 8 + day.rows.length * 6.6 : 5) + day.symptoms.length * 5 + (day.note ? 6 : 0)
    ensure(estimate <= pageContent ? estimate : 30)
    y += 2
    pdf.setDrawColor(...LINE)
    pdf.line(MARGIN, y, pageW - MARGIN, y)
    y += 2
    text(day.title, { size: 11.5, bold: true, gap: 1 })

    if (day.empty) {
      text('Nessun dato registrato.', { size: 9.5, color: MUTED })
      continue
    }

    if (day.rows.length) {
      autoTable(pdf, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN, bottom: FOOTER + 4, top: MARGIN + 7 },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 1.4,
          textColor: INK,
          lineColor: LINE,
          lineWidth: 0.2,
          overflow: 'linebreak',
          valign: 'top',
        },
        headStyles: { fillColor: [244, 244, 244], textColor: INK, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 13 },
          1: { cellWidth: 29 },
          3: { cellWidth: 24 },
          4: { cellWidth: 45 },
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
          if (hook.pageNumber === 1) return
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(10)
          pdf.setTextColor(...MUTED)
          pdf.text(pdfText(`${day.title} (continua)`), MARGIN, MARGIN + 4)
        },
      })
      y = lastY(pdf) + 2.5
    }

    if (day.noSymptoms) text('Nessun sintomo.', { size: 9.5, bold: true, color: OK })
    if (day.symptoms.length) {
      text('Sintomi e feci', { size: 9.5, bold: true, gap: 0.6 })
      for (const s of day.symptoms) text(`- ${s}`, { size: 9.5, indent: 2, gap: 0.4 })
      y += 0.8
    }
    if (day.supplements.length) text(`Integratori: ${day.supplements.join(', ')}`, { size: 9.5 })
    if (day.note) text(`Note: ${day.note}`, { size: 9.5 })
  }

  // Piè di pagina su ogni pagina
  const pages = pdf.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...MUTED)
    pdf.text(pdfText(`Diario alimentare - ${doc.period}`), MARGIN, pageH - 7)
    pdf.text(`Pagina ${i} di ${pages}`, pageW - MARGIN, pageH - 7, { align: 'right' })
  }

  return pdf.output('arraybuffer')
}

function lastY(pdf: unknown): number {
  return (pdf as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? MARGIN
}
