/**
 * Documento leggibile del diario per un intervallo di date, indipendente dal
 * formato: lo usano sia il PDF da condividere sia la vista stampabile.
 */
import { BRISTOL, MEAL_LABEL, MEALS, STATUS_LABEL, SYMPTOM_LABEL } from '@/model/constants'
import type { Entry, ISODate, Limits, Settings, SymptomType } from '@/model/types'
import {
  addDays,
  dateRange,
  diffDays,
  formatFull,
  formatLong,
  formatShort,
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
  /** Titolo della parte sintomi: "Sintomi", "Feci" o "Sintomi e feci". */
  symptomsTitle: string
  symptoms: string[]
  noSymptoms: boolean
  supplements: string[]
  note?: string
  empty: boolean
}

export interface ReportWeek {
  /** Es. "Settimana dal 28 settembre al 4 ottobre 2026". */
  title: string
  /** Avvertenza se la settimana va oltre il periodo o non è finita. */
  note?: string
  lines: AdherenceLine[]
}

export interface ReportSummaryLine {
  label: string
  value: string
}

export interface ReportDocument {
  title: string
  /** Es. "Dal 5 all'11 ottobre 2026". */
  period: string
  meta: string[]
  summary: ReportSummaryLine[]
  weeks: ReportWeek[]
  days: ReportDaySection[]
  /** Nome del file senza estensione. */
  fileName: string
}

const MONTH = new Intl.DateTimeFormat('it-IT', { month: 'long' })

export function capitalize(text: string): string {
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

/** Nome del file condiviso, es. "Diario alimentare 05-10-2026 - 11-10-2026". */
export function reportFileName(from: ISODate, to: ISODate): string {
  return `Diario alimentare ${fileDate(from)} - ${fileDate(to)}`
}

const MAIN_MEALS = MEALS.filter((m) => m.id !== 'fuori-pasto')

/**
 * Ordine nella giornata: i pasti nella loro sequenza, i "fuori pasto" al loro
 * posto in base all'orario (l'orario dei pasti principali è spesso quello di
 * inserimento, quindi non si ordina tutto per orario).
 */
function dayOrder(e: Entry): number {
  const i = MAIN_MEALS.findIndex((m) => m.id === e.meal)
  if (i >= 0) return i
  const next = MAIN_MEALS.findIndex((m) => m.defaultTime > e.time)
  return (next === -1 ? MAIN_MEALS.length : next) - 0.5
}

function sortForDay(entries: Entry[]): Entry[] {
  return [...entries].sort(
    (a, b) => dayOrder(a) - dayOrder(b) || a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt),
  )
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function supplementsSummary(data: ReportData, days: ISODate[], createdOn: ISODate): ReportSummaryLine[] {
  const out: ReportSummaryLine[] = []
  for (const s of data.supplements) {
    const taken = new Set(
      data.supplementLogs.filter((l) => l.supplementId === s.id && l.taken).map((l) => l.date),
    )
    const state = (d: ISODate) => supplementStatus(s, d).state
    // Oggi conta solo se è già stato preso; i giorni futuri non contano.
    const counted = (d: ISODate) => d < createdOn || (d === createdOn && taken.has(d))
    const elapsed = days.filter((d) => d <= createdOn)
    const phaseDays = elapsed.filter((d) => state(d) === 'giornaliero')
    const daily = phaseDays.filter(counted)
    const asNeeded = days.filter((d) => taken.has(d) && state(d) === 'al-bisogno').length
    if (daily.length) {
      const done = daily.filter((d) => taken.has(d)).length
      // Se la fase giornaliera copre solo una parte del periodo, si dice quale.
      const phase =
        phaseDays.length < elapsed.length
          ? phaseDays.length === 1
            ? ` (fase giornaliera: ${formatShort(phaseDays[0])})`
            : ` (fase giornaliera dal ${formatShort(phaseDays[0])} al ${formatShort(phaseDays[phaseDays.length - 1])})`
          : ''
      out.push({
        label: s.name,
        value:
          `preso ${plural(done, 'giorno', 'giorni')} su ${daily.length} previsti${phase}` +
          (asNeeded ? `, poi ${plural(asNeeded, 'volta', 'volte')} al bisogno` : ''),
      })
    } else if (asNeeded) {
      out.push({ label: s.name, value: `preso ${plural(asNeeded, 'volta', 'volte')} (al bisogno)` })
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
      value: `${plural(values.length, 'volta', 'volte')}, intensità media ${formatNumber(avg)}/10 (massima ${max})`,
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
      value: `${plural(stools.length, 'registrazione', 'registrazioni')}: ${detail}`,
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
  /** Data di creazione del documento (default: oggi); i giorni successivi non contano. */
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
  const allDays = dateRange(from, to)
  const elapsedDays = allDays.filter((d) => d <= createdOn)

  const sections: ReportDaySection[] = buildDayReports(data, from, to).map((day) => {
    const rows = sortForDay(day.entries).map((e): ReportRow => {
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
      const note = s.note ? ` – ${s.note}` : ''
      if (s.type === 'feci') {
        const label = BRISTOL[(s.bristol ?? 1) - 1]?.label.toLowerCase()
        return `${s.time} – Feci: tipo ${s.bristol} della scala di Bristol (${label})${note}`
      }
      return `${s.time} – ${symptomLabel(s)}: intensità ${s.intensity}/10${note}`
    })
    const hasStools = day.symptoms.some((s) => s.type === 'feci')
    const hasSymptoms = day.symptoms.some((s) => s.type !== 'feci')
    const supplements = day.supplementsTaken.map((s) => (s.time ? `${s.name} alle ${s.time}` : s.name))
    return {
      date: day.date,
      title: `${capitalize(formatLong(day.date))} ${parseISODate(day.date).getFullYear()}`,
      rows,
      symptomsTitle: hasSymptoms && hasStools ? 'Sintomi e feci' : hasStools ? 'Feci' : 'Sintomi',
      symptoms,
      noSymptoms: day.noSymptoms,
      supplements,
      note: day.note,
      empty: !rows.length && !symptoms.length && !day.noSymptoms && !day.note && !supplements.length,
    }
  })

  // Limiti sulla settimana intera (lunedì–domenica), anche oltre i bordi del periodo:
  // uova e latticini hanno limiti settimanali. Le settimane senza alimenti si saltano.
  const weekSource = data.weekEntries ?? data.entries
  const weeks: ReportWeek[] = []
  for (let start = weekStart(from); start <= to; start = addDays(start, 7)) {
    const end = addDays(start, 6)
    const entries = weekSource.filter((x) => x.date >= start && x.date <= end)
    if (!entries.length) continue
    const notes: string[] = []
    if (start < from || end > to) {
      notes.push(
        data.weekEntries
          ? 'conteggi sull’intera settimana, anche fuori dal periodo del diario'
          : 'conteggi solo sui giorni del periodo',
      )
    }
    if (end > createdOn) notes.push('settimana non ancora conclusa')
    weeks.push({
      title: `Settimana ${periodLabel(start, end)}`,
      note: notes.length ? `${capitalize(notes.join('; '))}.` : undefined,
      lines: adherenceLines(weekAdherence(entries, index, limits), limits),
    })
  }

  const mealDays = sections.filter((d) => d.rows.length && d.date <= createdOn).length
  const loggedDays = sections.filter((d) => !d.empty && d.date <= createdOn).length
  const symptomDays = new Set(data.symptoms.filter((s) => s.type !== 'feci').map((s) => s.date)).size
  const summary: ReportSummaryLine[] = [
    ...(elapsedDays.length
      ? [{ label: 'Giorni con pasti registrati', value: `${mealDays} su ${elapsedDays.length}` }]
      : []),
    ...(loggedDays
      ? [
          {
            label: 'Giorni con sintomi',
            value: `${symptomDays} su ${plural(loggedDays, 'giorno compilato', 'giorni compilati')}`,
          },
        ]
      : []),
    ...symptomsSummary(data),
    ...supplementsSummary(data, allDays, createdOn),
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
    days: mergeEmptyDays(sections),
    fileName: reportFileName(from, to),
  }
}
