/**
 * Contatori dei limiti del piano: olio EVO al giorno, uova e latticini
 * delattosati a settimana, frutti per spuntino. Funzioni pure, testate in
 * limits.test.ts.
 */
import { SNACK_MEALS } from '@/model/constants'
import type { Entry, Food, FoodTag, ISODate, Limits, MealId } from '@/model/types'
import { resolveFood, type FoodIndex } from './foods'
import { convertQuantity, toEggs, toTablespoons } from './units'

export function hasTag(food: Food | undefined, tag: FoodTag): boolean {
  return !!food?.tags?.includes(tag)
}

function withTag(entries: Entry[], index: FoodIndex, tag: FoodTag): Entry[] {
  return entries.filter((e) => hasTag(resolveFood(e, index), tag))
}

/** Cucchiai di olio EVO nelle voci date. */
export function oilTablespoons(entries: Entry[], index: FoodIndex): number {
  return withTag(entries, index, 'olio-evo').reduce(
    (sum, e) => sum + toTablespoons(e.quantity, e.unit),
    0,
  )
}

/** Uova nelle voci date. */
export function eggCount(entries: Entry[], index: FoodIndex): number {
  return withTag(entries, index, 'uovo').reduce((sum, e) => sum + toEggs(e.quantity, e.unit), 0)
}

const occasionKey = (e: Pick<Entry, 'date' | 'meal'>) => `${e.date}|${e.meal}`

/**
 * Volte in cui sono stati consumati latticini delattosati: più voci nello
 * stesso pasto dello stesso giorno contano come una volta sola.
 */
export function dairyOccasions(entries: Entry[], index: FoodIndex): number {
  return new Set(withTag(entries, index, 'latticino-delattosato').map(occasionKey)).size
}

/** Grammi di latticini delattosati per ogni pasto (chiave `data|pasto`). */
export function dairyGramsByOccasion(entries: Entry[], index: FoodIndex): Map<string, number> {
  const out = new Map<string, number>()
  for (const e of withTag(entries, index, 'latticino-delattosato')) {
    const grams = e.quantity != null && e.unit ? convertQuantity(e.quantity, e.unit, 'g') : null
    out.set(occasionKey(e), (out.get(occasionKey(e)) ?? 0) + (grams ?? 0))
  }
  return out
}

/** Frutti registrati (una voce = un frutto). */
export function fruitCount(entries: Entry[], index: FoodIndex): number {
  return withTag(entries, index, 'frutto').length
}

export function isSnack(meal: MealId): boolean {
  return SNACK_MEALS.includes(meal)
}

export interface Counter {
  id: 'olio' | 'uova' | 'latticini' | 'spuntino-mattina' | 'spuntino-pomeriggio'
  label: string
  value: number
  max: number
  unit: string
  period: string
  over: boolean
}

/**
 * Contatori da mostrare nel diario per una data: olio del giorno, uova e
 * latticini della settimana (lunedì–domenica), frutti negli spuntini del giorno.
 */
export function computeCounters(
  date: ISODate,
  weekEntries: Entry[],
  index: FoodIndex,
  limits: Limits,
): Counter[] {
  const day = weekEntries.filter((e) => e.date === date)
  const oil = oilTablespoons(day, index)
  const eggs = eggCount(weekEntries, index)
  const dairy = dairyOccasions(weekEntries, index)
  const fruit = (meal: MealId) => fruitCount(day.filter((e) => e.meal === meal), index)
  const morning = fruit('spuntino-mattina')
  const afternoon = fruit('spuntino-pomeriggio')
  return [
    {
      id: 'olio',
      label: 'Olio EVO',
      value: oil,
      max: limits.oilTbspPerDay,
      unit: 'cucchiai',
      period: 'oggi',
      over: oil > limits.oilTbspPerDay,
    },
    {
      id: 'uova',
      label: 'Uova',
      value: eggs,
      max: limits.eggsPerWeek,
      unit: '',
      period: 'settimana',
      over: eggs > limits.eggsPerWeek,
    },
    {
      id: 'latticini',
      label: 'Latticini delattosati',
      value: dairy,
      max: limits.dairyTimesPerWeek,
      unit: 'volte',
      period: 'settimana',
      over: dairy > limits.dairyTimesPerWeek,
    },
    {
      id: 'spuntino-mattina',
      label: 'Frutta spuntino mattina',
      value: morning,
      max: limits.fruitPerSnack,
      unit: '',
      period: 'oggi',
      over: morning > limits.fruitPerSnack,
    },
    {
      id: 'spuntino-pomeriggio',
      label: 'Frutta spuntino pomeriggio',
      value: afternoon,
      max: limits.fruitPerSnack,
      unit: '',
      period: 'oggi',
      over: afternoon > limits.fruitPerSnack,
    },
  ]
}

/** Voce con quantità oltre la porzione indicata per l'alimento. */
export function exceedsPortion(
  entry: Pick<Entry, 'quantity' | 'unit'>,
  food: Food | undefined,
): boolean {
  const max = food?.maxPortion
  if (!max || entry.quantity == null) return false
  const amount = convertQuantity(entry.quantity, entry.unit ?? max.unit, max.unit)
  return amount != null && amount > max.amount + 1e-9
}

export interface WeekAdherence {
  oilByDay: Map<ISODate, number>
  oilDaysOver: ISODate[]
  eggs: number
  eggsOver: boolean
  dairyOccasions: number
  dairyOver: boolean
  /** Pasti con latticini delattosati oltre i grammi indicati. */
  dairyPortionOver: string[]
  /** Spuntini con più frutti del previsto (chiave `data|pasto`). */
  fruitSnacksOver: string[]
  avoided: Entry[]
  portionExceeded: Entry[]
}

/** Aderenza ai limiti per un insieme di voci (di solito una settimana). */
export function weekAdherence(entries: Entry[], index: FoodIndex, limits: Limits): WeekAdherence {
  const oilByDay = new Map<ISODate, number>()
  for (const e of withTag(entries, index, 'olio-evo')) {
    oilByDay.set(e.date, (oilByDay.get(e.date) ?? 0) + toTablespoons(e.quantity, e.unit))
  }
  const oilDaysOver = [...oilByDay]
    .filter(([, v]) => v > limits.oilTbspPerDay)
    .map(([d]) => d)
    .sort()

  const fruitBySnack = new Map<string, number>()
  for (const e of withTag(entries, index, 'frutto')) {
    if (!isSnack(e.meal)) continue
    fruitBySnack.set(occasionKey(e), (fruitBySnack.get(occasionKey(e)) ?? 0) + 1)
  }

  const eggs = eggCount(entries, index)
  const dairy = dairyOccasions(entries, index)
  const dairyPortionOver = [...dairyGramsByOccasion(entries, index)]
    .filter(([, g]) => g > limits.dairyGramsPerServing)
    .map(([k]) => k)

  return {
    oilByDay,
    oilDaysOver,
    eggs,
    eggsOver: eggs > limits.eggsPerWeek,
    dairyOccasions: dairy,
    dairyOver: dairy > limits.dairyTimesPerWeek,
    dairyPortionOver,
    fruitSnacksOver: [...fruitBySnack].filter(([, n]) => n > limits.fruitPerSnack).map(([k]) => k),
    avoided: entries.filter((e) => resolveFood(e, index)?.status === 'evitare'),
    portionExceeded: entries.filter((e) => exceedsPortion(e, resolveFood(e, index))),
  }
}
