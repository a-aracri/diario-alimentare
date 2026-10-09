/**
 * Hook React reattivi sopra il repository: si aggiornano da soli quando i
 * dati cambiano (useLiveQuery di Dexie). Restituiscono undefined durante il
 * primo caricamento.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { weekEnd, weekStart } from '@/lib/dates'
import { buildFoodIndex } from '@/lib/foods'
import type { ReportData } from '@/lib/report'
import type { ISODate } from '@/model/types'
import { repo } from '@/repo'

export function useSettings() {
  return useLiveQuery(() => repo.settings.get(), [])
}

export function useFoods() {
  return useLiveQuery(() => repo.foods.all(), [])
}

export function useFoodIndex() {
  const foods = useFoods()
  return useMemo(() => (foods ? buildFoodIndex(foods) : undefined), [foods])
}

export function useEntries(date: ISODate) {
  return useLiveQuery(() => repo.entries.byDate(date), [date])
}

export function useEntriesRange(from: ISODate, to: ISODate) {
  return useLiveQuery(() => repo.entries.byRange(from, to), [from, to])
}

/** Voci della settimana (lunedì–domenica) che contiene la data. */
export function useWeekEntries(date: ISODate) {
  return useEntriesRange(weekStart(date), weekEnd(date))
}

export function useRecentFoodIds() {
  return useLiveQuery(() => repo.entries.recentFoodIds(), [])
}

export function useSymptoms(date: ISODate) {
  return useLiveQuery(() => repo.symptoms.byDate(date), [date])
}

export function useSymptomsRange(from: ISODate, to: ISODate) {
  return useLiveQuery(() => repo.symptoms.byRange(from, to), [from, to])
}

export function useDayLog(date: ISODate) {
  return useLiveQuery(async () => (await repo.dayLogs.get(date)) ?? null, [date])
}

export function useDayLogsRange(from: ISODate, to: ISODate) {
  return useLiveQuery(() => repo.dayLogs.byRange(from, to), [from, to])
}

export function useSupplements() {
  return useLiveQuery(() => repo.supplements.all(), [])
}

export function useSupplementLogs(date: ISODate) {
  return useLiveQuery(() => repo.supplements.logsByDate(date), [date])
}

export function useSupplementLogsRange(from: ISODate, to: ISODate) {
  return useLiveQuery(() => repo.supplements.logsByRange(from, to), [from, to])
}

export function useReintroTests() {
  return useLiveQuery(() => repo.reintro.all(), [])
}

/** Tutti i dati necessari per riepilogo, stampa ed export di un intervallo. */
export function useReportData(from: ISODate, to: ISODate): ReportData | undefined {
  return useLiveQuery(async () => {
    const [entries, symptoms, dayLogs, supplements, supplementLogs, foods] = await Promise.all([
      repo.entries.byRange(from, to),
      repo.symptoms.byRange(from, to),
      repo.dayLogs.byRange(from, to),
      repo.supplements.all(),
      repo.supplements.logsByRange(from, to),
      repo.foods.all(),
    ])
    return { entries, symptoms, dayLogs, supplements, supplementLogs, foods }
  }, [from, to])
}
