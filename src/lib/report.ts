/**
 * Aggregazione dei dati per riepilogo settimanale, vista stampabile ed
 * esportazione CSV.
 */
import { MEAL_LABEL, MEALS, STATUS_LABEL, SYMPTOM_LABEL } from '@/model/constants'
import type {
  DayLog,
  Entry,
  Food,
  ISODate,
  Limits,
  Supplement,
  SupplementLog,
  Symptom,
} from '@/model/types'
import { toCSV, type CSVCell } from './csv'
import { dateRange, formatFull, formatShort } from './dates'
import { buildFoodIndex, resolveFood } from './foods'
import type { WeekAdherence } from './limits'
import { formatNumber } from './units'

export interface ReportData {
  entries: Entry[]
  /**
   * Voci delle settimane intere (lunedì–domenica) che toccano il periodo: i limiti
   * settimanali vanno valutati sulla settimana completa. Se assente si usa `entries`.
   */
  weekEntries?: Entry[]
  symptoms: Symptom[]
  dayLogs: DayLog[]
  supplements: Supplement[]
  supplementLogs: SupplementLog[]
  foods: Food[]
}

export interface DayReport {
  date: ISODate
  entries: Entry[]
  symptoms: Symptom[]
  noSymptoms: boolean
  note?: string
  supplementsTaken: { name: string; time?: string }[]
}

const MEAL_ORDER = Object.fromEntries(MEALS.map((m, i) => [m.id, i]))

export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort(
    (a, b) =>
      MEAL_ORDER[a.meal] - MEAL_ORDER[b.meal] ||
      a.time.localeCompare(b.time) ||
      a.createdAt.localeCompare(b.createdAt),
  )
}

export function symptomLabel(s: Symptom): string {
  if (s.type === 'altro' && s.label) return s.label
  return SYMPTOM_LABEL[s.type]
}

export function buildDayReports(data: ReportData, from: ISODate, to: ISODate): DayReport[] {
  const supplementName = new Map(data.supplements.map((s) => [s.id, s.name]))
  return dateRange(from, to).map((date) => {
    const log = data.dayLogs.find((d) => d.date === date)
    return {
      date,
      entries: sortEntries(data.entries.filter((e) => e.date === date)),
      symptoms: data.symptoms
        .filter((s) => s.date === date)
        .sort((a, b) => a.time.localeCompare(b.time)),
      noSymptoms: !!log?.noSymptoms,
      note: log?.note,
      // Gli integratori eliminati non compaiono (resterebbe solo il loro id).
      supplementsTaken: data.supplementLogs
        .filter((l) => l.date === date && l.taken && supplementName.has(l.supplementId))
        .map((l) => ({ name: supplementName.get(l.supplementId)!, time: l.time })),
    }
  })
}

export const CSV_HEADER = [
  'Data',
  'Ora',
  'Tipo',
  'Pasto',
  'Voce',
  'Quantità',
  'Unità',
  'Stato alimento',
  'Intensità (0-10)',
  'Bristol (1-7)',
  'Note',
]

export function buildCSV(data: ReportData, from: ISODate, to: ISODate): string {
  const index = buildFoodIndex(data.foods)
  const rows: CSVCell[][] = [CSV_HEADER]
  for (const day of buildDayReports(data, from, to)) {
    const date = formatFull(day.date)
    const dayRows: { time: string; row: CSVCell[] }[] = []
    for (const e of day.entries) {
      const food = resolveFood(e, index)
      dayRows.push({
        time: e.time,
        row: [
          date,
          e.time,
          'Alimento',
          MEAL_LABEL[e.meal],
          e.name,
          e.quantity,
          e.unit,
          food ? STATUS_LABEL[food.status] : '',
          null,
          null,
          e.note,
        ],
      })
    }
    for (const s of day.symptoms) {
      dayRows.push({
        time: s.time,
        row: [
          date,
          s.time,
          s.type === 'feci' ? 'Feci' : 'Sintomo',
          null,
          symptomLabel(s),
          null,
          null,
          null,
          s.intensity,
          s.bristol,
          s.note,
        ],
      })
    }
    for (const t of day.supplementsTaken) {
      dayRows.push({
        time: t.time ?? '',
        row: [date, t.time, 'Integratore', null, t.name, null, null, null, null, null, null],
      })
    }
    dayRows.sort((a, b) => a.time.localeCompare(b.time))
    if (day.noSymptoms) {
      rows.push([date, null, 'Giornata', null, 'Nessun sintomo', null, null, null, null, null, null])
    }
    rows.push(...dayRows.map((r) => r.row))
    if (day.note) {
      rows.push([date, null, 'Nota del giorno', null, null, null, null, null, null, null, day.note])
    }
  }
  return toCSV(rows)
}

export interface AdherenceLine {
  id: string
  label: string
  ok: boolean
  detail: string
}

const uniqueNames = (entries: Entry[]) => [...new Set(entries.map((e) => e.name))].join(', ')

/**
 * Righe leggibili sull'aderenza ai limiti, per riepilogo, PDF e stampa:
 * prima il dato, poi il limite tra parentesi.
 */
export function adherenceLines(a: WeekAdherence, limits: Limits): AdherenceLine[] {
  const dairyPortion = a.dairyPortionOver.length
  const snacks = a.fruitSnacksOver.length
  const times = (n: number) => `${formatNumber(n)} ${n === 1 ? 'volta' : 'volte'}`
  return [
    {
      id: 'olio',
      label: 'Olio EVO',
      ok: !a.oilDaysOver.length,
      detail: a.oilDaysOver.length
        ? `${a.oilDaysOver
            .map((d) => `${formatShort(d)}: ${formatNumber(a.oilByDay.get(d) ?? 0)} cucchiai`)
            .join(', ')} (limite ${limits.oilTbspPerDay} al giorno)`
        : `Sempre entro il limite (${limits.oilTbspPerDay} cucchiai al giorno)`,
    },
    {
      id: 'uova',
      label: 'Uova',
      ok: !a.eggsOver,
      detail: `${formatNumber(a.eggs)} (limite ${limits.eggsPerWeek} a settimana)`,
    },
    {
      id: 'latticini',
      label: 'Latticini delattosati',
      ok: !a.dairyOver && !dairyPortion,
      detail:
        `${times(a.dairyOccasions)} (limite ${times(limits.dairyTimesPerWeek)} a settimana)` +
        (dairyPortion
          ? `; oltre ${limits.dairyGramsPerServing} g in ${dairyPortion} ${dairyPortion === 1 ? 'pasto' : 'pasti'}`
          : ''),
    },
    {
      id: 'frutta',
      label: 'Frutta negli spuntini',
      ok: !snacks,
      detail: snacks
        ? `${snacks} ${snacks === 1 ? 'spuntino' : 'spuntini'} con più frutti (limite ${limits.fruitPerSnack} per spuntino)`
        : `Sempre entro il limite (${limits.fruitPerSnack} per spuntino)`,
    },
    {
      id: 'evitare',
      label: 'Alimenti da evitare',
      ok: !a.avoided.length,
      detail: a.avoided.length ? uniqueNames(a.avoided) : 'Nessuno',
    },
    {
      id: 'porzioni',
      label: 'Porzioni superate',
      ok: !a.portionExceeded.length,
      detail: a.portionExceeded.length ? uniqueNames(a.portionExceeded) : 'Nessuna',
    },
  ]
}

/**
 * Impronta dei dati di un intervallo: cambia quando cambia qualcosa che finisce
 * nel documento, così il file condiviso viene rigenerato solo quando serve.
 */
export function reportSignature(data: ReportData, extra = ''): string {
  const latest = (rows: { updatedAt: string }[]) =>
    rows.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), '')
  const parts = [
    data.entries,
    data.weekEntries ?? [],
    data.symptoms,
    data.dayLogs,
    data.supplements,
    data.supplementLogs,
    data.foods,
  ].map(
    (rows) => `${rows.length}:${latest(rows)}`,
  )
  return [...parts, extra].join('|')
}
