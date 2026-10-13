import { SHOPPING_SECTION_LABEL } from '@/model/constants'
import type { ShoppingItem, ShoppingSection, ShoppingStatus } from '@/model/types'
import { normalize } from './foods'

/** Vista della lista: solo da comprare, solo in casa o l'elenco completo. */
export type ShoppingFilter = ShoppingStatus | 'tutto'

export interface ShoppingGroup {
  section: ShoppingSection
  items: ShoppingItem[]
}

export function shoppingCounts(items: ShoppingItem[]): Record<ShoppingFilter, number> {
  return {
    serve: items.filter((i) => i.status === 'serve').length,
    ho: items.filter((i) => i.status === 'ho').length,
    tutto: items.length,
  }
}

/** Voci della vista che contengono il testo cercato, per reparto e in ordine alfabetico. */
export function groupShopping(items: ShoppingItem[], filter: ShoppingFilter, query = ''): ShoppingGroup[] {
  const q = normalize(query)
  const visible = items.filter(
    (i) => (filter === 'tutto' || i.status === filter) && (!q || normalize(i.name).includes(q)),
  )
  return (Object.keys(SHOPPING_SECTION_LABEL) as ShoppingSection[])
    .map((section) => ({
      section,
      items: visible.filter((i) => i.section === section).sort((a, b) => a.name.localeCompare(b.name, 'it')),
    }))
    .filter((g) => g.items.length)
}
