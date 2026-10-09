import { db, type TableName } from './db'

export function newId(): string {
  return crypto.randomUUID()
}

export function nowISO(): string {
  return new Date().toISOString()
}

/** Elimina un record e ne registra la cancellazione (per una futura sincronizzazione). */
export async function removeWithTombstone(table: Exclude<TableName, 'tombstones'>, id: string) {
  await db.transaction('rw', db.table(table), db.tombstones, async () => {
    await db.table(table).delete(id)
    await db.tombstones.put({
      id: `${table}:${id}`,
      table,
      recordId: id,
      deletedAt: nowISO(),
    })
  })
}
