import { db, TABLES, type TableName } from './db'
import { nowISO } from './helpers'
import { ensureSeed } from './seed'

export const BACKUP_APP = 'diario-alimentare'
export const BACKUP_VERSION = 1

export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  data: Record<TableName, unknown[]>
}

/** Campo chiave di ogni tabella, usato per una validazione minima. */
const KEY: Record<TableName, string> = {
  foods: 'id',
  entries: 'id',
  symptoms: 'id',
  dayLogs: 'date',
  supplements: 'id',
  supplementLogs: 'id',
  reintroTests: 'id',
  settings: 'id',
  tombstones: 'id',
}

export class BackupError extends Error {}

export async function exportBackup(): Promise<BackupFile> {
  const data = {} as Record<TableName, unknown[]>
  await db.transaction('r', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) data[t] = await db.table(t).toArray()
  })
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: nowISO(), data }
}

/** Legge e valida un file di backup. Lancia BackupError con un messaggio leggibile. */
export function parseBackup(text: string): BackupFile {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new BackupError('Il file non è un JSON valido.')
  }
  const file = json as Partial<BackupFile>
  if (!file || typeof file !== 'object' || file.app !== BACKUP_APP) {
    throw new BackupError('Il file non è un backup di questa app.')
  }
  if (typeof file.version !== 'number' || file.version > BACKUP_VERSION) {
    throw new BackupError('Versione del backup non supportata: aggiorna l’app.')
  }
  if (!file.data || typeof file.data !== 'object') {
    throw new BackupError('Il backup non contiene dati.')
  }
  const data = {} as Record<TableName, unknown[]>
  for (const t of TABLES) {
    const rows = (file.data as Record<string, unknown>)[t] ?? []
    if (!Array.isArray(rows)) throw new BackupError(`Dati non validi nella tabella «${t}».`)
    for (const row of rows) {
      const key = (row as Record<string, unknown> | null)?.[KEY[t]]
      if (typeof key !== 'string' || !key) {
        throw new BackupError(`Record senza chiave nella tabella «${t}».`)
      }
    }
    data[t] = rows
  }
  return { app: BACKUP_APP, version: file.version, exportedAt: String(file.exportedAt ?? ''), data }
}

/** Sostituisce tutti i dati locali con quelli del backup. */
export async function restoreBackup(file: BackupFile): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      await db.table(t).bulkPut(file.data[t])
    }
  })
  await ensureSeed()
}

/** Cancella tutti i dati e ricarica il database alimenti predefinito. */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear()
  })
  await ensureSeed()
}
