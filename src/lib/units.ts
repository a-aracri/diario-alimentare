import { UNITS } from '@/model/constants'
import type { Portion, Unit } from '@/model/types'

const SHORT = Object.fromEntries(UNITS.map((u) => [u.id, u.short])) as Record<Unit, string>

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(n)
}

export function formatQuantity(quantity?: number, unit?: Unit): string {
  if (quantity == null) return unit ? SHORT[unit] : ''
  if (!unit) return formatNumber(quantity)
  return `${formatNumber(quantity)} ${SHORT[unit]}`
}

export function formatPortion(p?: Portion): string {
  return p ? formatQuantity(p.amount, p.unit) : ''
}

/**
 * Converte una quantità nell'unità della porzione di riferimento, se possibile.
 * Grammi e millilitri sono trattati come equivalenti (densità ≈ 1),
 * 1 cucchiaio = 3 cucchiaini. Restituisce null se le unità non sono confrontabili.
 */
export function convertQuantity(quantity: number, from: Unit, to: Unit): number | null {
  if (from === to) return quantity
  const mass = (u: Unit) => u === 'g' || u === 'ml'
  if (mass(from) && mass(to)) return quantity
  if (from === 'cucchiaini' && to === 'cucchiai') return quantity / 3
  if (from === 'cucchiai' && to === 'cucchiaini') return quantity * 3
  return null
}

/** Grammi di olio in un cucchiaio (approssimazione usata per i contatori). */
export const OIL_GRAMS_PER_TBSP = 10
/** Grammi di un uovo medio senza guscio (approssimazione usata per i contatori). */
export const EGG_GRAMS = 55

/** Cucchiai di olio corrispondenti alla quantità registrata. */
export function toTablespoons(quantity: number | undefined, unit: Unit | undefined): number {
  if (quantity == null) return 1
  switch (unit) {
    case 'cucchiaini':
      return quantity / 3
    case 'g':
    case 'ml':
      return quantity / OIL_GRAMS_PER_TBSP
    default:
      return quantity
  }
}

/** Numero di uova corrispondente alla quantità registrata. */
export function toEggs(quantity: number | undefined, unit: Unit | undefined): number {
  if (quantity == null) return 1
  if (unit === 'g') return quantity / EGG_GRAMS
  return quantity
}
