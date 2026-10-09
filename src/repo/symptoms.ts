import type { DayLog, ISODate, Symptom } from '@/model/types'
import { db } from './db'
import { newId, nowISO, removeWithTombstone } from './helpers'

export type SymptomInput = Omit<Symptom, 'id' | 'createdAt' | 'updatedAt'> &
  Partial<Pick<Symptom, 'id' | 'createdAt'>>

export const symptomsRepo = {
  byDate(date: ISODate): Promise<Symptom[]> {
    return db.symptoms.where('date').equals(date).toArray()
  },

  byRange(from: ISODate, to: ISODate): Promise<Symptom[]> {
    return db.symptoms.where('date').between(from, to, true, true).toArray()
  },

  /** Salva un sintomo; se non sono feci, toglie "Nessun sintomo oggi". */
  async save(input: SymptomInput): Promise<Symptom> {
    const now = nowISO()
    const symptom: Symptom = {
      ...input,
      id: input.id ?? newId(),
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    }
    await db.transaction('rw', db.symptoms, db.dayLogs, async () => {
      await db.symptoms.put(symptom)
      if (symptom.type !== 'feci') {
        const log = await db.dayLogs.get(symptom.date)
        if (log?.noSymptoms) await db.dayLogs.put({ ...log, noSymptoms: false, updatedAt: now })
      }
    })
    return symptom
  },

  remove(id: string): Promise<void> {
    return removeWithTombstone('symptoms', id)
  },
}

export const dayLogsRepo = {
  get(date: ISODate): Promise<DayLog | undefined> {
    return db.dayLogs.get(date)
  },

  byRange(from: ISODate, to: ISODate): Promise<DayLog[]> {
    return db.dayLogs.where('date').between(from, to, true, true).toArray()
  },

  async update(date: ISODate, patch: Partial<Omit<DayLog, 'date' | 'updatedAt'>>): Promise<void> {
    const current = await db.dayLogs.get(date)
    await db.dayLogs.put({ ...current, ...patch, date, updatedAt: nowISO() })
  },
}
