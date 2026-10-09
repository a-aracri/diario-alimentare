/**
 * Documento leggibile del diario per un intervallo di date, indipendente dal
 * formato: lo usano sia il PDF da condividere sia la vista stampabile.
 */
import { BRISTOL, MEAL_LABEL, STATUS_LABEL, SYMPTOM_LABEL } from '@/model/constants'
import type { ISODate, Limits, Settings, SymptomType } from '@/model/types'
import {
  addDays,
  dateRange,
  diffDays,
  formatFull,
  formatLong,
  parseISODate,
  today,
  weekStart,
} from './dates'
import { buildFoodIndex, resolveFood } from './foods'
import { exceedsPortion, weekAdherence } from './limits'
import { adherenceLines, buildDayReports, symptomLabel, type AdherenceLine, type ReportData } from './report'
import { supplementStatus } from './supplements'
import { formatNumber, formatPortion, formatQuantity } from './units'

export interface ReportRow {
  time: string
  meal: string
  food: string
  quantity: string
  note: string
  /** Segnalazione da evidenziare, es. "da evitare". */
  flag?: string
}

export interface ReportDaySection {
  date: ISODate
  title: string
  rows: ReportRow[]
  symptoms: string[]
  noSymptoms: boolean
  supplements: string[]
  note?: string
  empty: boolean
}

export interface ReportWeek {
  title: string
  /** Vuoto se nella settimana non c'è nessun alimento registrato. */
  lines: AdherenceLine[]
}

export interface ReportSummaryLine {
  label: string
  value: string
}

export interface ReportDocument {
  title: string
  /** Es. "dal 5 all'11 ottobre 2026". */
  period: string
  meta: string[]
  summary: ReportSummaryLine[]
  weeks: ReportWeek[]
  days: ReportDaySection[]
  /** Nome del file senza estensione, es. "Diario alimentare 05-10-2026 - 11-10-2026". */
  fileName: string
}

const MONTH = new Intl.DateTimeFormat('it-IT', { month: 'long' })

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Giorno come si scrive in italiano: "1°", "5", "11". */
function dayNumber(date: Date): string {
  return date.getDate() === 1 ? '1°' : String(date.getDate())
}

/** "dal"/"al" con l'apostrofo davanti a 8 e 11 ("dall'8", "all'11"). */
function prep(base: 'da' | 'a', date: Date): string {
  const d = date.getDate()
  return d === 8 || d === 11 ? `${base}ll'${d}` : `${base}l ${dayNumber(date)}`
}

/** Intervallo in italiano: "dal 5 all'11 ottobre 2026", "dal 28 settembre al 4 ottobre 2026". */
export function periodLabel(from: ISODate, to: ISODate): string {
  const a = parseISODate(from)
  const b = parseISODate(to)
  if (from === to) return `${capitalize(formatLong(from))} ${a.getFullYear()}`
  const sameYear = a.getFullYear() === b.getFullYear()
  const sameMonth = sameYear && a.getMonth() === b.getMonth()
  const start = sameMonth
    ? prep('da', a)
    : `${prep('da', a)} ${MONTH.format(a)}${sameYear ? '' : ` ${a.getFullYear()}`}`
  return `${start} ${prep('a', b)} ${MONTH.format(b)} ${b.getFullYear()}`
}

const fileDate = (date: ISODate) => formatFull(date).replace(/\//g, '-')

function supplementsSummary(data: ReportData, days: ISODate[]): ReportSummaryLine[] {
  const out: ReportSummaryLine[] = []
  for (const s of data.supplements) {
    const taken = new Set(
      data.supplementLogs.filter((l) => l.supplementId === s.id && l.taken).map((l) => l.date),
    )
    const expected = days.filter((d) => supplementStatus(s, d).state === 'giornaliero')
    if (expected.length) {
      const done = expected.filter((d) => taken.has(d)).length
      out.push({ label: s.name, value: `preso ${done} ${done === 1 ? 'giorno' : 'giorni'} su ${expected.length}` })
    } else if (taken.size) {
      out.push({ label: s.name, value: `preso ${taken.size} ${taken.size === 1 ? 'volta' : 'volte'} (al bisogno)` })
    }
  }
  return out
}

function symptomsSummary(data: ReportData): ReportSummaryLine[] {
  const out: ReportSummaryLine[] = []
  const byType = new Map<string, number[]>()
  for (const s of data.symptoms) {
    if (s.type === 'feci') continue
    const label = s.type === 'altro' ? symptomLabel(s) : SYMPTOM_LABEL[s.type as SymptomType]
    byType.set(label, [...(byType.get(label) ?? []), s.intensity ?? 0])
  }
  for (const [label, values] of [...byType].sort((a, b) => b[1].length - a[1].length)) {
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length
    const max = Math.max(...values)
    out.push({
      label,
      value: `${values.length} ${values.length === 1 ? 'volta' : 'volte'}, intensità media ${formatNumber(avg)}/10 (massima ${max})`,
    })
  }
  const stools = data.symptoms.filter((s) => s.type === 'feci' && s.bristol)
  if (stools.length) {
    const counts = new Map<number, number>()
    for (const s of stools) counts.set(s.bristol!, (counts.get(s.bristol!) ?? 0) + 1)
    const detail = [...counts]
      .sort((a, b) => a[0] - b[0])
      .map(([type, n]) => `tipo ${type} (${n})`)
      .join(', ')
    out.push({
      label: 'Feci (scala di Bristol)',
      value: `${stools.length} ${stools.length === 1 ? 'registrazione' : 'registrazioni'}: ${detail}`,
    })
  }
  return out
}

/** Unisce i giorni vuoti consecutivi in una sola sezione ("Dal 26 settembre all'8 ottobre 2026"). */
function mergeEmptyDays(days: ReportDaySection[]): ReportDaySection[] {
  const out: ReportDaySection[] = []
  let run: ReportDaySection[] = []
  const flush = () => {
    if (run.length === 1) out.push(run[0])
    else if (run.length > 1) {
      out.push({ ...run[0], title: capitalize(periodLabel(run[0].date, run[run.length - 1].date)) })
    }
    run = []
  }
  for (const day of days) {
    if (day.empty) run.push(day)
    else {
      flush()
      out.push(day)
    }
  }
  flush()
  return out
}

export interface BuildOptions {
  settings: Pick<Settings, 'limits' | 'dietStartDate'>
  /** Data di creazione mostrata nel documento (default: oggi). */
  createdOn?: ISODate
}

export function buildReportDocument(
  data: ReportData,
  from: ISODate,
  to: ISODate,
  { settings, createdOn = today() }: BuildOptions,
): ReportDocument {
  const limits: Limits = settings.limits
  const index = buildFoodIndex(data.foods)
  const dayReports = buildDayReports(data, from, to)
  const allDays = dateRange(from, to)

  const days: ReportDaySection[] = dayReports.map((day) => {
    const rows = day.entries.map((e): ReportRow => {
      const food = resolveFood(e, index)
      const flag =
        food?.status === 'evitare' || food?.status === 'verificare'
          ? STATUS_LABEL[food.status].toLowerCase()
          : exceedsPortion(e, food)
            ? `oltre la porzione, max ${formatPortion(food?.maxPortion)}`
            : undefined
      return {
        time: e.time,
        meal: MEAL_LABEL[e.meal],
        food: e.name,
        quantity: formatQuantity(e.quantity, e.unit),
        note: e.note ?? '',
        flag,
      }
    })
    const symptoms = day.symptoms.map((s) => {
      const detail =
        s.type === 'feci'
          ? `Bristol ${s.bristol} (${BRISTOL[(s.bristol ?? 1) - 1]?.label.toLowerCase()})`
          : `intensità ${s.intensity}/10`
      return `${s.time} – ${symptomLabel(s)}: ${detail}${s.note ? ` – ${s.note}` : ''}`
    })
    const supplements = day.supplementsTaken.map((s) => (s.time ? `${s.name} (${s.time})` : s.name))
    return {
      date: day.date,
      title: `${capitalize(formatLong(day.date))} ${parseISODate(day.date).getFullYear()}`,
      rows,
      symptoms,
      noSymptoms: day.noSymptoms,
      supplements,
      note: day.note,
      empty: !rows.length && !symptoms.length && !day.noSymptoms && !day.note && !supplements.length,
    }
  })

  // Aderenza per settimana (lunedì–domenica), limitata all'intervallo scelto.
  const weeks: ReportWeek[] = []
  for (let start = weekStart(from); start <= to; start = addDays(start, 7)) {
    const s = start < from ? from : start
    const e = addDays(start, 6) > to ? to : addDays(start, 6)
    const entries = data.entries.filter((x) => x.date >= s && x.date <= e)
    weeks.push({
      title: s === e ? formatFull(s) : `${formatFull(s)} – ${formatFull(e)}`,
      // Senza alimenti registrati i limiti risulterebbero "rispettati": meglio non mostrarli.
      lines: entries.length ? adherenceLines(weekAdherence(entries, index, limits), limits) : [],
    })
  }

  const daysWithData = days.filter((d) => !d.empty).length
  const quietDays = days.filter((d) => d.noSymptoms).length
  const summary: ReportSummaryLine[] = [
    { label: 'Giorni compilati', value: `${daysWithData} su ${allDays.length}` },
    ...(quietDays ? [{ label: 'Giorni senza sintomi', value: String(quietDays) }] : []),
    ...symptomsSummary(data),
    ...supplementsSummary(data, allDays),
  ]

  const meta: string[] = []
  if (settings.dietStartDate) {
    const day = diffDays(settings.dietStartDate, from) + 1
    meta.push(
      `Inizio della dieta: ${formatFull(settings.dietStartDate)}` +
        (day > 0 ? ` (il periodo parte dal giorno ${day})` : ''),
    )
  }
  meta.push(`Creato il ${formatFull(createdOn)}`)

  return {
    title: 'Diario alimentare – dieta Low FODMAP',
    period: capitalize(periodLabel(from, to)),
    meta,
    summary,
    weeks,
    days: mergeEmptyDays(days),
    fileName: `Diario alimentare ${fileDate(from)} - ${fileDate(to)}`,
  }
}
