import type { ReintroTest } from '@/model/types'
import { db } from './db'
import { newId, nowISO, removeWithTombstone } from './helpers'

export type ReintroInput = Omit<ReintroTest, 'id' | 'createdAt' | 'updatedAt'> &
  Partial<Pick<ReintroTest, 'id' | 'createdAt'>>

export const reintroRepo = {
  all(): Promise<ReintroTest[]> {
    return db.reintroTests.orderBy('startDate').reverse().toArray()
  },

  async save(input: ReintroInput): Promise<ReintroTest> {
    const now = nowISO()
    const test: ReintroTest = {
      ...input,
      id: input.id ?? newId(),
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    }
    await db.reintroTests.put(test)
    return test
  },

  remove(id: string): Promise<void> {
    return removeWithTombstone('reintroTests', id)
  },
}
