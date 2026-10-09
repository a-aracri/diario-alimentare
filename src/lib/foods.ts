import type { Entry, Food, FoodStatus } from '@/model/types'

/** Minuscole, senza accenti e spazi superflui: per confronti e ricerca. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export interface FoodIndex {
  byId: Map<string, Food>
  byName: Map<string, Food>
}

export function buildFoodIndex(foods: Food[]): FoodIndex {
  const byId = new Map<string, Food>()
  const byName = new Map<string, Food>()
  for (const f of foods) {
    byId.set(f.id, f)
    byName.set(normalize(f.name), f)
  }
  return { byId, byName }
}

/** Trova l'alimento di una voce: per id, altrimenti per nome esatto. */
export function resolveFood(
  entry: Pick<Entry, 'foodId' | 'name'>,
  index: FoodIndex,
): Food | undefined {
  if (entry.foodId) {
    const f = index.byId.get(entry.foodId)
    if (f) return f
  }
  return index.byName.get(normalize(entry.name))
}

const STATUS_RANK: Record<FoodStatus, number> = {
  permesso: 0,
  limite: 1,
  verificare: 2,
  evitare: 3,
}

/**
 * Ricerca per nome e sinonimi. Ordina: inizio nome, inizio parola, contenuto;
 * a parità prima i preferiti, poi gli alimenti consentiti, poi alfabetico.
 */
export function searchFoods(foods: Food[], query: string, limit = 50): Food[] {
  const q = normalize(query)
  if (!q) return []
  const scored: { food: Food; score: number }[] = []
  for (const food of foods) {
    const names = [food.name, ...(food.aliases ?? [])].map(normalize)
    let score = Infinity
    for (const [i, n] of names.entries()) {
      const penalty = i === 0 ? 0 : 0.5
      if (n === q) score = Math.min(score, 0 + penalty)
      else if (n.startsWith(q)) score = Math.min(score, 1 + penalty)
      else if (n.split(/[ (\-,]/).some((w) => w.startsWith(q))) score = Math.min(score, 2 + penalty)
      else if (n.includes(q)) score = Math.min(score, 3 + penalty)
    }
    if (score !== Infinity) scored.push({ food, score })
  }
  scored.sort(
    (a, b) =>
      a.score - b.score ||
      Number(!!b.food.favorite) - Number(!!a.food.favorite) ||
      STATUS_RANK[a.food.status] - STATUS_RANK[b.food.status] ||
      a.food.name.localeCompare(b.food.name, 'it'),
  )
  return scored.slice(0, limit).map((s) => s.food)
}

export function sortByName(foods: Food[]): Food[] {
  return [...foods].sort((a, b) => a.name.localeCompare(b.name, 'it'))
}

/** Gruppi delle liste di alimenti: i consentiti (permessi e con limite) vengono prima. */
export type FoodGroup = 'consentiti' | 'verificare' | 'evitare'

const GROUP_ORDER: FoodGroup[] = ['consentiti', 'verificare', 'evitare']

export const FOOD_GROUP_LABEL: Record<FoodGroup, string> = {
  consentiti: 'Consentiti',
  verificare: 'Da verificare',
  evitare: 'Da evitare',
}

export function foodGroup(food: Food): FoodGroup {
  if (food.status === 'evitare') return 'evitare'
  if (food.status === 'verificare') return 'verificare'
  return 'consentiti'
}

/**
 * Ordine nelle liste: prima i consentiti, poi quelli da verificare, in fondo
 * quelli da evitare; alfabetico dentro ogni gruppo.
 */
export function sortForList(foods: Food[]): Food[] {
  return [...foods].sort(
    (a, b) =>
      GROUP_ORDER.indexOf(foodGroup(a)) - GROUP_ORDER.indexOf(foodGroup(b)) ||
      a.name.localeCompare(b.name, 'it'),
  )
}

/** Etichetta da mostrare prima di `foods[i]` se lì inizia un nuovo gruppo (non per il primo). */
export function groupLabelAt(foods: Food[], i: number): string | undefined {
  if (i === 0) return undefined
  const group = foodGroup(foods[i])
  return group !== foodGroup(foods[i - 1]) ? FOOD_GROUP_LABEL[group] : undefined
}
