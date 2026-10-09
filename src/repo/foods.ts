import type { Food } from '@/model/types'
import { db } from './db'
import { newId, nowISO, removeWithTombstone } from './helpers'

export type FoodInput = Omit<Food, 'id' | 'updatedAt'> & { id?: string }

export const foodsRepo = {
  all(): Promise<Food[]> {
    return db.foods.toArray()
  },

  get(id: string): Promise<Food | undefined> {
    return db.foods.get(id)
  },

  async save(input: FoodInput): Promise<Food> {
    const food: Food = { ...input, id: input.id ?? newId(), updatedAt: nowISO() }
    await db.foods.put(food)
    return food
  },

  async toggleFavorite(id: string): Promise<void> {
    const food = await db.foods.get(id)
    if (food) await db.foods.put({ ...food, favorite: !food.favorite, updatedAt: nowISO() })
  },

  remove(id: string): Promise<void> {
    return removeWithTombstone('foods', id)
  },
}
