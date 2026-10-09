import { addDays } from '@/lib/dates'
import type { Entry, ISODate, MealId } from '@/model/types'
import { db } from './db'
import { newId, nowISO, removeWithTombstone } from './helpers'

export type EntryInput = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'> &
  Partial<Pick<Entry, 'id' | 'createdAt'>>

export const entriesRepo = {
  byDate(date: ISODate): Promise<Entry[]> {
    return db.entries.where('date').equals(date).toArray()
  },

  byRange(from: ISODate, to: ISODate): Promise<Entry[]> {
    return db.entries.where('date').between(from, to, true, true).toArray()
  },

  async save(input: EntryInput): Promise<Entry> {
    const now = nowISO()
    const entry: Entry = {
      ...input,
      id: input.id ?? newId(),
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    }
    await db.entries.put(entry)
    return entry
  },

  async saveMany(inputs: EntryInput[]): Promise<Entry[]> {
    const now = nowISO()
    const entries = inputs.map((input) => ({
      ...input,
      id: input.id ?? newId(),
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    }))
    await db.entries.bulkPut(entries)
    return entries
  },

  remove(id: string): Promise<void> {
    return removeWithTombstone('entries', id)
  },

  /** Copia le voci di un pasto dal giorno precedente. Restituisce quante voci ha copiato. */
  async repeatFromPreviousDay(date: ISODate, meal: MealId): Promise<number> {
    const previous = await db.entries
      .where('date')
      .equals(addDays(date, -1))
      .filter((e) => e.meal === meal)
      .toArray()
    await entriesRepo.saveMany(
      previous.map(({ meal, time, foodId, name, quantity, unit, note }) => ({
        date,
        meal,
        time,
        foodId,
        name,
        quantity,
        unit,
        note,
      })),
    )
    return previous.length
  },

  /** Id degli alimenti usati di recente, dal più recente. */
  async recentFoodIds(limit = 12): Promise<string[]> {
    const recent = await db.entries.orderBy('updatedAt').reverse().limit(200).toArray()
    const ids: string[] = []
    for (const e of recent) {
      if (e.foodId && !ids.includes(e.foodId)) ids.push(e.foodId)
      if (ids.length >= limit) break
    }
    return ids
  },

  /** Ultima quantità usata per un alimento, per precompilare il modulo. */
  async lastUse(foodId: string): Promise<Entry | undefined> {
    const uses = await db.entries.where('foodId').equals(foodId).toArray()
    return uses.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  },
}
