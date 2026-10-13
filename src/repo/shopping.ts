import type { ShoppingItem, ShoppingStatus } from '@/model/types'
import { db } from './db'
import { newId, nowISO, removeWithTombstone } from './helpers'

export type ShoppingInput = Omit<ShoppingItem, 'id' | 'updatedAt'> & { id?: string }

export const shoppingRepo = {
  all(): Promise<ShoppingItem[]> {
    return db.shopping.toArray()
  },

  async save(input: ShoppingInput): Promise<ShoppingItem> {
    const item: ShoppingItem = { ...input, id: input.id ?? newId(), updatedAt: nowISO() }
    await db.shopping.put(item)
    return item
  },

  /** Segna "ce l'ho" o "mi serve"; senza stato la voce torna da segnare. */
  async setStatus(id: string, status: ShoppingStatus | undefined): Promise<void> {
    await db.shopping.update(id, { status, updatedAt: nowISO() })
  },

  remove(id: string): Promise<void> {
    return removeWithTombstone('shopping', id)
  },
}
