import { describe, expect, it } from 'vitest'
import { entry, foods, limits } from '@/test/fixtures'
import type { DayLog, Supplement, SupplementLog, Symptom } from '@/model/types'
import { pdfText, renderReportPdf } from './pdf-report'
import { buildReportDocument, periodLabel } from './report-document'
import { reportSignature, type ReportData } from './report'

const symptom = (s: Partial<Symptom> & Pick<Symptom, 'date' | 'type'>): Symptom => ({
  id: `${s.date}-${s.type}-${s.time ?? ''}`,
  time: '10:00',
  createdAt: '',
  updatedAt: '',
  ...s,
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
      ],
      dayLogs: [{ date: '2026-10-07', noSymptoms: true, updatedAt: '' } satisfies DayLog],
      supplements: [probiotico, massigen],
      supplementLogs: [
        { id: 'a', supplementId: 'probiotico', date: '2026-10-05', taken: true, time: '21:30', updatedAt: '' },
        { id: 'b', supplementId: 'probiotico', date: '2026-10-06', taken: true, updatedAt: '' },
        { id: 'c', supplementId: 'massigen', date: '2026-10-06', taken: true, updatedAt: '' },
      ] satisfies SupplementLog[],
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

  it('un singolo giorno vuoto resta con il suo titolo', () => {
    const d = buildReportDocument(
      data({ entries: [entry({ date: '2026-10-05', foodId: 'riso' }), entry({ date: '2026-10-07', foodId: 'riso' })] }),
      '2026-10-05',
      '2026-10-07',
      { settings },
    )
    expect(d.days.map((x) => x.title)).toEqual([
      'Lunedì 5 ottobre 2026',
      'Martedì 6 ottobre 2026',
      'Mercoledì 7 ottobre 2026',
    ])
    expect(d.days[1].empty).toBe(true)
  })

  it('righe leggibili con segnalazioni', () => {
    const [riso, aglio, zucchine] = doc.days[0].rows
    expect(riso).toMatchObject({ time: '13:00', meal: 'Pranzo', food: 'Riso', quantity: '80 g', flag: undefined })
    expect(aglio.flag).toBe('da evitare')
    expect(zucchine).toMatchObject({ flag: 'oltre la porzione, max 65 g', note: 'grigliate' })
  })

  it('sintomi, feci, integratori e giornata senza sintomi', () => {
    expect(doc.days[0].symptoms).toEqual(['15:00 – Gonfiore: intensità 4/10'])
    expect(doc.days[1].symptoms).toEqual([
      '08:00 – Feci (Bristol): Bristol 4 (a salsiccia o serpente, liscia e morbida)',
      '21:00 – Gonfiore: intensità 6/10 – dopo cena',
    ])
    expect(doc.days[0].supplements).toEqual(['Probiotico (21:30)'])
    expect(doc.days[2].noSymptoms).toBe(true)
  })

  it('riepilogo del periodo', () => {
    expect(doc.summary).toEqual([
      { label: 'Giorni compilati', value: '3 su 7' },
      { label: 'Giorni senza sintomi', value: '1' },
      { label: 'Gonfiore', value: '2 volte, intensità media 5/10 (massima 6)' },
      { label: 'Feci (scala di Bristol)', value: '1 registrazione: tipo 4 (1)' },
      { label: 'Probiotico', value: 'preso 2 giorni su 7' },
      { label: 'Massigen', value: 'preso 1 volta (al bisogno)' },
    ])
  })

  it('aderenza ai limiti per settimana', () => {
    expect(doc.weeks).toHaveLength(1)
    const olio = doc.weeks[0].lines.find((l) => l.id === 'olio')!
    expect(olio.ok).toBe(false)
    expect(doc.weeks[0].lines.find((l) => l.id === 'evitare')?.detail).toBe('Aglio')
  })

  it('divide le settimane e le taglia sull’intervallo', () => {
    const d = buildReportDocument(data(), '2026-10-08', '2026-10-14', { settings })
    expect(d.weeks.map((w) => w.title)).toEqual(['08/10/2026 – 11/10/2026', '12/10/2026 – 14/10/2026'])
  })

  it('una settimana senza alimenti non risulta "nei limiti"', () => {
    const d = buildReportDocument(data(), '2026-10-05', '2026-10-11', { settings })
    expect(d.weeks[0].lines).toEqual([])
  })
})

describe('PDF', () => {
  it('normalizza i caratteri non supportati dai font standard', () => {
    expect(pdfText('Caffè – “dolce”… l’ultimo 😊 €2')).toBe('Caffè - "dolce"... l\'ultimo EUR2')
    expect(pdfText('perché più già ½ cucchiaio')).toBe('perché più già ½ cucchiaio')
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
})
