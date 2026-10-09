import type { ISODate, TimeHM } from '@/model/types'

const pad = (n: number) => String(n).padStart(2, '0')

/** Converte una Date in data locale YYYY-MM-DD (non UTC). */
export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Interpreta YYYY-MM-DD come data locale a mezzanotte. */
export function parseISODate(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today(now: Date = new Date()): ISODate {
  return toISODate(now)
}

export function nowTime(now: Date = new Date()): TimeHM {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = parseISODate(date)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Differenza in giorni tra due date (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** Lunedì della settimana che contiene la data. */
export function weekStart(date: ISODate): ISODate {
  const d = parseISODate(date)
  const offset = (d.getDay() + 6) % 7
  return addDays(date, -offset)
}

export function weekEnd(date: ISODate): ISODate {
  return addDays(weekStart(date), 6)
}

/** Tutte le date da `from` a `to` incluse. */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

const longFmt = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const shortFmt = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const fullFmt = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** Es. "giovedì 9 ottobre". */
export function formatLong(date: ISODate): string {
  return longFmt.format(parseISODate(date))
}

/** Es. "gio 9 ott". */
export function formatShort(date: ISODate): string {
  return shortFmt.format(parseISODate(date))
}

/** Es. "09/10/2026". */
export function formatFull(date: ISODate): string {
  return fullFmt.format(parseISODate(date))
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${formatFull(toISODate(d))} ${nowTime(d)}`
}

/** "Oggi", "Ieri", "Domani" oppure la data estesa. */
export function relativeLabel(date: ISODate, ref: ISODate = today()): string {
  const diff = diffDays(ref, date)
  if (diff === 0) return 'Oggi'
  if (diff === -1) return 'Ieri'
  if (diff === 1) return 'Domani'
  return formatLong(date)
}
