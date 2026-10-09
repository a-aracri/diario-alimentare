import type { ISODate, Supplement } from '@/model/types'
import { addDays, diffDays, nowTime, today } from './dates'

export type SupplementState = 'giornaliero' | 'al-bisogno' | 'concluso' | 'non-iniziato'

export interface SupplementStatus {
  state: SupplementState
  /** Giorno corrente della fase giornaliera (1 = primo giorno). */
  day?: number
  /** Primo giorno dopo la fase giornaliera. */
  endDate?: ISODate
}

/** Stato di un integratore in una certa data, in base a inizio e durata. */
export function supplementStatus(s: Supplement, date: ISODate): SupplementStatus {
  if (s.mode === 'al-bisogno') return { state: 'al-bisogno' }
  if (!s.startDate) return { state: 'giornaliero' }
  if (date < s.startDate) return { state: 'non-iniziato' }
  const day = diffDays(s.startDate, date) + 1
  if (s.durationDays && s.durationDays > 0) {
    const endDate = addDays(s.startDate, s.durationDays)
    if (date >= endDate) {
      return { state: s.afterDuration === 'al-bisogno' ? 'al-bisogno' : 'concluso', endDate }
    }
    return { state: 'giornaliero', day, endDate }
  }
  return { state: 'giornaliero', day }
}

/**
 * Promemoria da evidenziare: integratore giornaliero non ancora spuntato,
 * oggi, dopo l'orario indicato (o in un giorno passato).
 */
export function isReminderDue(
  s: Supplement,
  date: ISODate,
  taken: boolean,
  now: Date = new Date(),
): boolean {
  if (taken || supplementStatus(s, date).state !== 'giornaliero') return false
  const t = today(now)
  if (date < t) return true
  if (date > t) return false
  return !s.reminderTime || nowTime(now) >= s.reminderTime
}
