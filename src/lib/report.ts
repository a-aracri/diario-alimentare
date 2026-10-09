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
      supplementsTaken: data.supplementLogs
        .filter((l) => l.date === date && l.taken)
        .map((l) => ({ name: supplementName.get(l.supplementId) ?? l.supplementId, time: l.time })),
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

/** Righe leggibili sull'aderenza ai limiti, per riepilogo e stampa. */
export function adherenceLines(a: WeekAdherence, limits: Limits): AdherenceLine[] {
  const dairyPortion = a.dairyPortionOver.length
  return [
    {
      id: 'olio',
      label: 'Olio EVO',
      ok: !a.oilDaysOver.length,
      detail: a.oilDaysOver.length
        ? `Oltre ${limits.oilTbspPerDay} cucchiai: ${a.oilDaysOver.map(formatShort).join(', ')}`
        : `Entro ${limits.oilTbspPerDay} cucchiai al giorno`,
    },
    {
      id: 'uova',
      label: 'Uova',
      ok: !a.eggsOver,
      detail: `${formatNumber(a.eggs)} su ${limits.eggsPerWeek} a settimana`,
    },
    {
      id: 'latticini',
      label: 'Latticini delattosati',
      ok: !a.dairyOver && !dairyPortion,
      detail:
        `${a.dairyOccasions} ${a.dairyOccasions === 1 ? 'volta' : 'volte'} su ${limits.dairyTimesPerWeek} a settimana` +
        (dairyPortion
          ? `; oltre ${limits.dairyGramsPerServing} g in ${dairyPortion} ${dairyPortion === 1 ? 'pasto' : 'pasti'}`
          : ''),
    },
    {
      id: 'frutta',
      label: 'Frutta negli spuntini',
      ok: !a.fruitSnacksOver.length,
      detail: a.fruitSnacksOver.length
        ? `Più di ${limits.fruitPerSnack} in ${a.fruitSnacksOver.length} ${a.fruitSnacksOver.length === 1 ? 'spuntino' : 'spuntini'}`
        : `Massimo ${limits.fruitPerSnack} per spuntino`,
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
