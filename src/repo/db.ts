import Dexie, { type EntityTable } from 'dexie'
import type {
  DayLog,
  Entry,
  Food,
  ReintroTest,
  Settings,
  Supplement,
  SupplementLog,
  Symptom,
  Tombstone,
} from '@/model/types'

/**
 * Database IndexedDB locale. Solo i moduli in src/repo lo usano direttamente:
 * il resto dell'app passa dal repository (src/repo/index.ts).
 *
 * Per cambiare lo schema aggiungi una nuova `this.version(n)` senza
 * modificare quelle esistenti.
 */
export class DiaryDB extends Dexie {
  foods!: EntityTable<Food, 'id'>
  entries!: EntityTable<Entry, 'id'>
  symptoms!: EntityTable<Symptom, 'id'>
  dayLogs!: EntityTable<DayLog, 'date'>
  supplements!: EntityTable<Supplement, 'id'>
  supplementLogs!: EntityTable<SupplementLog, 'id'>
  reintroTests!: EntityTable<ReintroTest, 'id'>
  settings!: EntityTable<Settings, 'id'>
  tombstones!: EntityTable<Tombstone, 'id'>

  constructor(name = 'diario-alimentare') {
    super(name)
    this.version(1).stores({
      foods: 'id, name, category',
      entries: 'id, date, foodId, updatedAt',
      symptoms: 'id, date, updatedAt',
      dayLogs: 'date',
      supplements: 'id, order',
      supplementLogs: 'id, date, supplementId',
      reintroTests: 'id, startDate',
      settings: 'id',
      tombstones: 'id, table, deletedAt',
    })
  }
}

export const TABLES = [
  'foods',
  'entries',
  'symptoms',
  'dayLogs',
  'supplements',
  'supplementLogs',
  'reintroTests',
  'settings',
  'tombstones',
] as const

export type TableName = (typeof TABLES)[number]

export const db = new DiaryDB()
