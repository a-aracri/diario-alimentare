import { DEFAULT_LIMITS } from '@/data/piano'
import { SEED_FOODS } from '@/data/fodmap'
import { buildFoodIndex } from '@/lib/foods'
import type { Entry, Food, Limits } from '@/model/types'

export const foods: Food[] = SEED_FOODS.map((f) => ({ ...f, updatedAt: '2026-01-01T00:00:00.000Z' }))
export const index = buildFoodIndex(foods)
export const limits: Limits = { ...DEFAULT_LIMITS }

let seq = 0
export function entry(partial: Partial<Entry> & Pick<Entry, 'foodId'>): Entry {
  const food = index.byId.get(partial.foodId!)
  seq += 1
  return {
    id: `e${seq}`,
    date: '2026-10-07',
    meal: 'pranzo',
    time: '13:00',
    name: food?.name ?? partial.foodId!,
    createdAt: '2026-10-07T11:00:00.000Z',
    updatedAt: '2026-10-07T11:00:00.000Z',
    ...partial,
  }
}
