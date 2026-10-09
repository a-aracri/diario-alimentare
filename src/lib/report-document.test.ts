import { describe, expect, it } from 'vitest'
import { entry, foods, limits } from '@/test/fixtures'
import type { DayLog, Supplement, SupplementLog, Symptom } from '@/model/types'
import { pdfText, renderReportPdf } from './pdf-report'
import { buildReportDocument, periodLabel, reportFileName } from './report-document'
import { reportSignature, type ReportData } from './report'

const symptom = (s: Partial<Symptom> & Pick<Symptom, 'date' | 'type'>): Symptom => ({
  id: `${s.date}-${s.type}-${s.time ?? ''}`,
  time: '10:00',
  createdAt: '',
  updatedAt: '',
  ...s,
})

const log = (supplementId: string, date: string, time?: string): SupplementLog => ({
  id: `${supplementId}|${date}`,
  supplementId,
  date,
  taken: true,
  time,
  updatedAt: '',
})

const probiotico: Supplement = {
  id: 'probiotico',
  name: 'Probiotico',
  timing: 'Dopo cena',
  mode: 'giornaliero',
  startDate: '2026-10-01',
  durationDays: 30,
  afterDuration: 'al-bisogno',
  order: 1,
  updatedAt: '',
}
const massigen: Supplement = { id: 'massigen', name: 'Massigen', timing: 'Al bisogno', mode: 'al-bisogno', order: 2, updatedAt: '' }

function data(partial: Partial<ReportData> = {}): ReportData {
  return { entries: [], symptoms: [], dayLogs: [], supplements: [], supplementLogs: [], foods, ...partial }
}

const settings = { limits, dietStartDate: '2026-10-01' }

describe('periodLabel', () => {
  it('scrive l’intervallo in italiano', () => {
    expect(periodLabel('2026-10-05', '2026-10-11')).toBe("dal 5 all'11 ottobre 2026")
    expect(periodLabel('2026-09-28', '2026-10-04')).toBe('dal 28 settembre al 4 ottobre 2026')
    expect(periodLabel('2026-12-28', '2027-01-03')).toBe('dal 28 dicembre 2026 al 3 gennaio 2027')
    expect(periodLabel('2026-10-01', '2026-10-08')).toBe("dal 1° all'8 ottobre 2026")
  })

  it('un solo giorno', () => {
    expect(periodLabel('2026-10-09', '2026-10-09')).toBe('Venerdì 9 ottobre 2026')
  })

  it('nome del file senza barre', () => {
    expect(reportFileName('2026-10-05', '2026-10-11')).toBe('Diario alimentare 05-10-2026 - 11-10-2026')
  })
})

describe('buildReportDocument', () => {
  const doc = buildReportDocument(
    data({
      entries: [
        entry({ date: '2026-10-05', foodId: 'riso', quantity: 80, unit: 'g', time: '13:00' }),
        entry({ date: '2026-10-05', foodId: 'aglio', time: '13:05' }),
        entry({ date: '2026-10-05', foodId: 'zucchine', quantity: 100, unit: 'g', time: '13:10', note: 'grigliate' }),
        entry({ date: '2026-10-06', foodId: 'olio-evo', quantity: 5, unit: 'cucchiai', meal: 'cena', time: '20:00' }),
      ],
      symptoms: [
        symptom({ date: '2026-10-05', type: 'gonfiore', intensity: 4, time: '15:00' }),
        symptom({ date: '2026-10-06', type: 'gonfiore', intensity: 6, time: '21:00', note: 'dopo cena' }),
        symptom({ date: '2026-10-06', type: 'feci', bristol: 4, time: '08:00' }),
        symptom({ date: '2026-10-07', type: 'feci', bristol: 3, time: '08:30' }),
      ],
      dayLogs: [{ date: '2026-10-07', noSymptoms: true, updatedAt: '' } satisfies DayLog],
      supplements: [probiotico, massigen],
      supplementLogs: [
        log('probiotico', '2026-10-05', '21:30'),
        log('probiotico', '2026-10-06'),
        log('massigen', '2026-10-06'),
      ],
    }),
    '2026-10-05',
    '2026-10-11',
    { settings, createdOn: '2026-10-12' },
  )

  it('intestazione, periodo e nome del file', () => {
    expect(doc.period).toBe("Dal 5 all'11 ottobre 2026")
    expect(doc.meta).toEqual(['Inizio della dieta: 01/10/2026 (il periodo parte dal giorno 5)', 'Creato il 12/10/2026'])
    expect(doc.fileName).toBe('Diario alimentare 05-10-2026 - 11-10-2026')
  })

  it('un giorno per sezione, con i giorni vuoti consecutivi uniti', () => {
    expect(doc.days.map((d) => d.title)).toEqual([
      'Lunedì 5 ottobre 2026',
      'Martedì 6 ottobre 2026',
      'Mercoledì 7 ottobre 2026',
      "Dall'8 all'11 ottobre 2026",
    ])
    expect(doc.days.map((d) => d.empty)).toEqual([false, false, false, true])
  })

  it('righe leggibili con segnalazioni', () => {
    const [riso, aglio, zucchine] = doc.days[0].rows
    expect(riso).toMatchObject({ time: '13:00', meal: 'Pranzo', food: 'Riso', quantity: '80 g', flag: undefined })
    expect(aglio.flag).toBe('da evitare')
    expect(zucchine).toMatchObject({ flag: 'oltre la porzione, max 65 g', note: 'grigliate' })
  })

  it('sintomi, feci e integratori in frasi semplici', () => {
    expect(doc.days[0].symptoms).toEqual(['15:00 – Gonfiore: intensità 4/10'])
    expect(doc.days[0].symptomsTitle).toBe('Sintomi')
    expect(doc.days[1].symptoms).toEqual([
      '08:00 – Feci: tipo 4 della scala di Bristol (a salsiccia o serpente, liscia e morbida)',
      '21:00 – Gonfiore: intensità 6/10 – dopo cena',
    ])
    expect(doc.days[1].symptomsTitle).toBe('Sintomi e feci')
    expect(doc.days[0].supplements).toEqual(['Probiotico alle 21:30'])
  })

  it('"nessun sintomo" con le sole feci non sembra una contraddizione', () => {
    expect(doc.days[2]).toMatchObject({ noSymptoms: true, symptomsTitle: 'Feci' })
  })

  it('riepilogo del periodo', () => {
    expect(doc.summary).toEqual([
      { label: 'Giorni con pasti registrati', value: '2 su 7' },
      { label: 'Giorni con sintomi', value: '2 su 3 giorni compilati' },
      { label: 'Gonfiore', value: '2 volte, intensità media 5/10 (massima 6)' },
      { label: 'Feci (scala di Bristol)', value: '2 registrazioni: tipo 3 (1), tipo 4 (1)' },
      { label: 'Probiotico', value: 'preso 2 giorni su 7 previsti' },
      { label: 'Massigen', value: 'preso 1 volta (al bisogno)' },
    ])
  })

  it('limiti scritti con il dato e il limite', () => {
    expect(doc.weeks).toHaveLength(1)
    expect(doc.weeks[0].title).toBe("Settimana dal 5 all'11 ottobre 2026")
    const line = (id: string) => doc.weeks[0].lines.find((l) => l.id === id)!
    expect(line('olio')).toMatchObject({ ok: false, detail: 'mar 6 ott: 5 cucchiai (limite 4 al giorno)' })
    expect(line('uova').detail).toBe('0 (limite 6 a settimana)')
    expect(line('latticini').detail).toBe('0 volte (limite 1 volta a settimana)')
    expect(line('frutta').detail).toBe('Sempre entro il limite (1 per spuntino)')
    expect(line('evitare').detail).toBe('Aglio')
  })
})

describe('limiti sulla settimana intera', () => {
  // Venerdì 9/10: "Ultimi 7 giorni" va da sabato 3 a venerdì 9.
  const yogurt = (date: string) => entry({ date, foodId: 'yogurt-delattosato', meal: 'colazione' })

  it('conta anche i giorni della settimana fuori dal periodo', () => {
    const weekEntries = [yogurt('2026-09-28'), yogurt('2026-10-03')]
    const d = buildReportDocument(
      data({ entries: [yogurt('2026-10-03')], weekEntries }),
      '2026-10-03',
      '2026-10-09',
      { settings, createdOn: '2026-10-09' },
    )
    expect(d.weeks.map((w) => w.title)).toEqual(['Settimana dal 28 settembre al 4 ottobre 2026'])
    const dairy = d.weeks[0].lines.find((l) => l.id === 'latticini')!
    expect(dairy).toMatchObject({ ok: false, detail: '2 volte (limite 1 volta a settimana)' })
    expect(d.weeks[0].note).toBe('Conteggi sull’intera settimana, anche fuori dal periodo del diario.')
  })

  it('segnala la settimana non ancora conclusa', () => {
    const d = buildReportDocument(
      data({ entries: [yogurt('2026-10-06')], weekEntries: [yogurt('2026-10-06')] }),
      '2026-10-05',
      '2026-10-09',
      { settings, createdOn: '2026-10-09' },
    )
    expect(d.weeks[0].note).toBe(
      'Conteggi sull’intera settimana, anche fuori dal periodo del diario; settimana non ancora conclusa.',
    )
  })

  it('salta le settimane senza alimenti', () => {
    const d = buildReportDocument(data(), '2026-10-05', '2026-10-11', { settings })
    expect(d.weeks).toEqual([])
  })
})

describe('ordine delle voci nella giornata', () => {
  it('i fuori pasto vanno al loro posto in base all’orario', () => {
    const d = buildReportDocument(
      data({
        entries: [
          entry({ date: '2026-10-05', foodId: 'pollo', meal: 'cena', time: '20:00' }),
          entry({ date: '2026-10-05', foodId: 'kiwi', meal: 'fuori-pasto', time: '17:00' }),
          entry({ date: '2026-10-05', foodId: 'riso', meal: 'pranzo', time: '13:00' }),
          entry({ date: '2026-10-05', foodId: 'tisana', meal: 'colazione', time: '13:30' }),
        ],
      }),
      '2026-10-05',
      '2026-10-05',
      { settings },
    )
    expect(d.days[0].rows.map((r) => r.meal)).toEqual(['Colazione', 'Pranzo', 'Fuori pasto', 'Cena'])
  })
})

describe('integratori nel riepilogo', () => {
  const daily = { ...probiotico, startDate: '2026-09-01' }
  const range = (from: string, n: number) =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date(`${from}T12:00:00`)
      d.setDate(d.getDate() + i)
      return d.toISOString().slice(0, 10)
    })

  it('non conta oggi se non è ancora stato preso, né i giorni futuri', () => {
    const logs = range('2026-10-05', 4).map((d) => log('probiotico', d)) // 5–8 ottobre
    const d = buildReportDocument(
      data({ supplements: [{ ...daily, startDate: '2026-09-20' }], supplementLogs: logs }),
      '2026-10-05',
      '2026-10-11',
      { settings, createdOn: '2026-10-09' },
    )
    expect(d.summary.find((s) => s.label === 'Probiotico')?.value).toBe('preso 4 giorni su 4 previsti')
  })

  it('mostra la fase giornaliera e le assunzioni al bisogno dopo', () => {
    const logs = [...range('2026-09-25', 6), '2026-10-03', '2026-10-06'].map((d) => log('probiotico', d))
    const d = buildReportDocument(
      data({ supplements: [daily], supplementLogs: logs }),
      '2026-09-25',
      '2026-10-08',
      { settings, createdOn: '2026-10-09' },
    )
    expect(d.summary.find((s) => s.label === 'Probiotico')?.value).toBe(
      'preso 6 giorni su 6 previsti (fase giornaliera dal ven 25 set al mer 30 set), poi 2 volte al bisogno',
    )
  })

  it('non mostra gli integratori eliminati', () => {
    const d = buildReportDocument(
      data({ supplements: [], supplementLogs: [log('glutagenics', '2026-10-05')], entries: [entry({ date: '2026-10-05', foodId: 'riso' })] }),
      '2026-10-05',
      '2026-10-05',
      { settings },
    )
    expect(d.days[0].supplements).toEqual([])
  })
})

describe('PDF', () => {
  it('tiene la punteggiatura tipografica e toglie i caratteri non supportati', () => {
    expect(pdfText('Caffè – “dolce”… l’ultimo 😊 €2 •')).toBe('Caffè – “dolce”… l’ultimo €2 •')
    expect(pdfText('perché più già ½ cucchiaio')).toBe('perché più già ½ cucchiaio')
    expect(pdfText('stressante 😓, dormito poco')).toBe('stressante, dormito poco')
    expect(pdfText('„citazione‟ −5')).toBe('"citazione -5')
  })

  it('genera un PDF valido', async () => {
    const doc = buildReportDocument(
      data({ entries: [entry({ date: '2026-10-05', foodId: 'riso', quantity: 80, unit: 'g' })] }),
      '2026-10-05',
      '2026-10-06',
      { settings },
    )
    const bytes = new Uint8Array(await renderReportPdf(doc))
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    expect(bytes.length).toBeGreaterThan(1000)
  })
})

describe('reportSignature', () => {
  it('cambia quando cambiano i dati', () => {
    const base = data({ entries: [entry({ foodId: 'riso', updatedAt: '2026-10-07T10:00:00.000Z' })] })
    const changed = data({ entries: [entry({ foodId: 'riso', updatedAt: '2026-10-07T11:00:00.000Z' })] })
    expect(reportSignature(base)).toBe(reportSignature(data({ entries: [...base.entries] })))
    expect(reportSignature(base)).not.toBe(reportSignature(changed))
    expect(reportSignature(base, 'a')).not.toBe(reportSignature(base, 'b'))
  })

  it('tiene conto anche delle voci della settimana intera', () => {
    const base = data()
    expect(reportSignature(base)).not.toBe(
      reportSignature(data({ weekEntries: [entry({ foodId: 'uova', updatedAt: '2026-10-01T10:00:00.000Z' })] })),
    )
  })
})
