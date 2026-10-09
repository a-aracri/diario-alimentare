import { nowTime, today } from '@/lib/dates'
import type { ISODate, Supplement, SupplementLog } from '@/model/types'
import { db } from './db'
import { newId, nowISO, removeWithTombstone } from './helpers'

export type SupplementInput = Omit<Supplement, 'id' | 'updatedAt'> & { id?: string }

export const supplementsRepo = {
  all(): Promise<Supplement[]> {
    return db.supplements.orderBy('order').toArray()
  },

  async save(input: SupplementInput): Promise<Supplement> {
    const supplement: Supplement = { ...input, id: input.id ?? newId(), updatedAt: nowISO() }
    await db.supplements.put(supplement)
    return supplement
  },

  remove(id: string): Promise<void> {
    return removeWithTombstone('supplements', id)
  },

  logsByDate(date: ISODate): Promise<SupplementLog[]> {
    return db.supplementLogs.where('date').equals(date).toArray()
  },

  logsByRange(from: ISODate, to: ISODate): Promise<SupplementLog[]> {
    return db.supplementLogs.where('date').between(from, to, true, true).toArray()
  },

  async setTaken(supplementId: string, date: ISODate, taken: boolean): Promise<void> {
    await db.supplementLogs.put({
      id: `${supplementId}|${date}`,
      supplementId,
      date,
      taken,
      time: taken && date === today() ? nowTime() : undefined,
      updatedAt: nowISO(),
    })
  },
}
