/**
 * Avvisi gentili e non bloccanti mostrati quando si registra un alimento.
 * Funzione pura, testata in warnings.test.ts.
 */
import { ACUTE_TAG_LABEL } from '@/model/constants'
import type { Entry, Food, Limits } from '@/model/types'
import { resolveFood, type FoodIndex } from './foods'
import {
  dairyGramsByOccasion,
  dairyOccasions,
  eggCount,
  exceedsPortion,
  fruitCount,
  hasTag,
  isSnack,
  oilTablespoons,
} from './limits'
import { convertQuantity, formatNumber, formatPortion, formatQuantity, toEggs, toTablespoons } from './units'

export type WarningCode =
  | 'evitare'
  | 'verificare'
  | 'acuta'
  | 'porzione'
  | 'olio'
  | 'uova'
  | 'latticini-frequenza'
  | 'latticini-porzione'
  | 'frutta-spuntino'

export interface EntryWarning {
  code: WarningCode
  level: 'info' | 'warning'
  message: string
}

export type EntryDraft = Pick<Entry, 'date' | 'meal' | 'name'> &
  Partial<Pick<Entry, 'id' | 'foodId' | 'quantity' | 'unit'>>

export interface EvaluateInput {
  draft: EntryDraft
  /** Alimento selezionato; se assente viene cercato per id o nome. */
  food?: Food
  /** Voci della settimana (lun–dom) della bozza; la bozza stessa viene ignorata. */
  weekEntries: Entry[]
  index: FoodIndex
  limits: Limits
  acuteMode: boolean
}

export function evaluateEntry({
  draft,
  food: selected,
  weekEntries,
  index,
  limits,
  acuteMode,
}: EvaluateInput): EntryWarning[] {
  const food = selected ?? resolveFood(draft, index)
  if (!food) return []
  const out: EntryWarning[] = []
  const name = food.name

  if (food.status === 'evitare') {
    out.push({
      code: 'evitare',
      level: 'warning',
      message: `«${name}» è tra gli alimenti da evitare nel piano. Puoi registrarlo comunque: sarà utile alla nutrizionista.`,
    })
  } else if (food.status === 'verificare') {
    out.push({
      code: 'verificare',
      level: 'info',
      message: `«${name}» è da verificare con la nutrizionista.`,
    })
  }

  if (acuteMode) {
    const labels = (food.tags ?? []).map((t) => ACUTE_TAG_LABEL[t]).filter(Boolean)
    if (labels.length) {
      out.push({
        code: 'acuta',
        level: 'warning',
        message: `Fase acuta attiva: in questo periodo sono sconsigliati ${labels.join(', ')}.`,
      })
    }
  }

  if (exceedsPortion(draft, food)) {
    out.push({
      code: 'porzione',
      level: 'warning',
      message: `La porzione indicata è ${formatPortion(food.maxPortion)}: stai registrando ${formatQuantity(draft.quantity, draft.unit ?? food.maxPortion?.unit)}.`,
    })
  }

  const others = weekEntries.filter((e) => !draft.id || e.id !== draft.id)
  const sameDay = others.filter((e) => e.date === draft.date)
  const sameMeal = sameDay.filter((e) => e.meal === draft.meal)

  if (hasTag(food, 'olio-evo')) {
    const total = oilTablespoons(sameDay, index) + toTablespoons(draft.quantity, draft.unit)
    if (total > limits.oilTbspPerDay) {
      out.push({
        code: 'olio',
        level: 'warning',
        message: `Con questa voce arrivi a ${formatNumber(total)} cucchiai di olio EVO nella giornata (indicazione: max ${limits.oilTbspPerDay}).`,
      })
    }
  }

  if (hasTag(food, 'uovo')) {
    const total = eggCount(others, index) + toEggs(draft.quantity, draft.unit)
    if (total > limits.eggsPerWeek) {
      out.push({
        code: 'uova',
        level: 'warning',
        message: `Con questa voce arrivi a ${formatNumber(total)} uova in settimana (indicazione: max ${limits.eggsPerWeek}).`,
      })
    }
  }

  if (hasTag(food, 'latticino-delattosato')) {
    const asEntry = { ...draft, id: draft.id ?? '__draft__', foodId: food.id } as Entry
    const occasions = dairyOccasions([...others, asEntry], index)
    if (occasions > limits.dairyTimesPerWeek) {
      out.push({
        code: 'latticini-frequenza',
        level: 'warning',
        message: `Latticini delattosati: sarebbe la ${occasions}ª volta in settimana (indicazione: ${limits.dairyTimesPerWeek} a settimana).`,
      })
    }
    const draftGrams =
      draft.quantity != null && draft.unit ? (convertQuantity(draft.quantity, draft.unit, 'g') ?? 0) : 0
    const mealGrams =
      (dairyGramsByOccasion(sameMeal, index).get(`${draft.date}|${draft.meal}`) ?? 0) + draftGrams
    if (mealGrams > limits.dairyGramsPerServing) {
      out.push({
        code: 'latticini-porzione',
        level: 'warning',
        message: `Latticini delattosati: ${formatNumber(mealGrams)} g in questo pasto (indicazione: ${limits.dairyGramsPerServing} g).`,
      })
    }
  }

  if (hasTag(food, 'frutto') && isSnack(draft.meal)) {
    const total = fruitCount(sameMeal, index) + 1
    if (total > limits.fruitPerSnack) {
      out.push({
        code: 'frutta-spuntino',
        level: 'warning',
        message: `In questo spuntino ci sarebbero ${total} frutti: il piano ne indica ${limits.fruitPerSnack} per spuntino.`,
      })
    }
  }

  return out
}
