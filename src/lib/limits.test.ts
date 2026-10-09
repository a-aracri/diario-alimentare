import { describe, expect, it } from 'vitest'
import { entry, index, limits } from '@/test/fixtures'
import {
  computeCounters,
  dairyOccasions,
  eggCount,
  exceedsPortion,
  fruitCount,
  oilTablespoons,
  weekAdherence,
} from './limits'

describe('olio EVO', () => {
  it('somma i cucchiai convertendo cucchiaini e grammi', () => {
    const entries = [
      entry({ foodId: 'olio-evo', quantity: 2, unit: 'cucchiai' }),
      entry({ foodId: 'olio-evo', quantity: 3, unit: 'cucchiaini' }),
      entry({ foodId: 'olio-evo', quantity: 10, unit: 'g' }),
    ]
    expect(oilTablespoons(entries, index)).toBe(4)
  })

  it('conta 1 cucchiaio se la quantità manca', () => {
    expect(oilTablespoons([entry({ foodId: 'olio-evo' })], index)).toBe(1)
  })

  it('ignora gli altri alimenti', () => {
    expect(oilTablespoons([entry({ foodId: 'olio-di-cocco', quantity: 3, unit: 'cucchiai' })], index)).toBe(0)
  })

  it('riconosce l’olio anche da testo libero con lo stesso nome', () => {
    const free = entry({ foodId: undefined, name: 'olio evo', quantity: 2, unit: 'cucchiai' })
    expect(oilTablespoons([free], index)).toBe(2)
  })
})

describe('uova', () => {
  it('conta i pezzi e converte i grammi', () => {
    const entries = [
      entry({ foodId: 'uova', quantity: 2, unit: 'pezzi' }),
      entry({ foodId: 'uova' }),
      entry({ foodId: 'uova', quantity: 110, unit: 'g' }),
    ]
    expect(eggCount(entries, index)).toBe(5)
  })
})

describe('latticini delattosati', () => {
  it('conta una volta per pasto anche con più voci', () => {
    const entries = [
      entry({ foodId: 'yogurt-delattosato', meal: 'spuntino-mattina' }),
      entry({ foodId: 'latte-delattosato', meal: 'spuntino-mattina' }),
      entry({ foodId: 'mozzarella-delattosata', meal: 'cena', date: '2026-10-08' }),
    ]
    expect(dairyOccasions(entries, index)).toBe(2)
  })
})

describe('frutta', () => {
  it('conta una voce per frutto, esclusa l’uvetta', () => {
    const entries = [
      entry({ foodId: 'kiwi', meal: 'spuntino-mattina' }),
      entry({ foodId: 'uvetta-sultanina', meal: 'spuntino-mattina' }),
    ]
    expect(fruitCount(entries, index)).toBe(1)
  })
})

describe('porzione massima', () => {
  const broccoli = index.byId.get('broccoli-solo-teste')
  it('segnala quantità oltre la porzione', () => {
    expect(exceedsPortion({ quantity: 80, unit: 'g' }, broccoli)).toBe(true)
    expect(exceedsPortion({ quantity: 75, unit: 'g' }, broccoli)).toBe(false)
  })
  it('tratta ml e g come equivalenti', () => {
    const te = index.byId.get('te-verde')
    expect(exceedsPortion({ quantity: 300, unit: 'ml' }, te)).toBe(true)
  })
  it('ignora unità non confrontabili o quantità assenti', () => {
    expect(exceedsPortion({ quantity: 3, unit: 'pezzi' }, broccoli)).toBe(false)
    expect(exceedsPortion({}, broccoli)).toBe(false)
  })
  it('usa l’unità della porzione se l’unità manca', () => {
    expect(exceedsPortion({ quantity: 2 }, index.byId.get('arancia'))).toBe(true)
  })
})

describe('computeCounters', () => {
  it('calcola i contatori di giorno e settimana', () => {
    const week = [
      entry({ date: '2026-10-07', foodId: 'olio-evo', quantity: 5, unit: 'cucchiai' }),
      entry({ date: '2026-10-06', foodId: 'olio-evo', quantity: 2, unit: 'cucchiai' }),
      entry({ date: '2026-10-05', foodId: 'uova', quantity: 4, unit: 'pezzi' }),
      entry({ date: '2026-10-07', foodId: 'uova', quantity: 3, unit: 'pezzi' }),
      entry({ date: '2026-10-07', foodId: 'kiwi', meal: 'spuntino-pomeriggio' }),
    ]
    const counters = Object.fromEntries(
      computeCounters('2026-10-07', week, index, limits).map((c) => [c.id, c]),
    )
    expect(counters.olio).toMatchObject({ value: 5, max: 4, over: true })
    expect(counters.uova).toMatchObject({ value: 7, max: 6, over: true })
    expect(counters.latticini).toMatchObject({ value: 0, over: false })
    expect(counters['spuntino-pomeriggio']).toMatchObject({ value: 1, over: false })
  })

  it('rispetta i limiti personalizzati', () => {
    const week = [entry({ foodId: 'olio-evo', quantity: 3, unit: 'cucchiai' })]
    const [olio] = computeCounters('2026-10-07', week, index, { ...limits, oilTbspPerDay: 2 })
    expect(olio.over).toBe(true)
  })
})

describe('weekAdherence', () => {
  it('riassume gli sforamenti della settimana', () => {
    const week = [
      entry({ date: '2026-10-05', foodId: 'olio-evo', quantity: 5, unit: 'cucchiai' }),
      entry({ date: '2026-10-06', foodId: 'olio-evo', quantity: 3, unit: 'cucchiai' }),
      entry({ foodId: 'yogurt-delattosato', quantity: 200, unit: 'g', meal: 'colazione' }),
      entry({ foodId: 'kiwi', meal: 'spuntino-mattina' }),
      entry({ foodId: 'fragole', meal: 'spuntino-mattina', quantity: 100, unit: 'g' }),
      entry({ foodId: 'aglio' }),
    ]
    const a = weekAdherence(week, index, limits)
    expect(a.oilDaysOver).toEqual(['2026-10-05'])
    expect(a.dairyPortionOver).toEqual(['2026-10-07|colazione'])
    expect(a.dairyOver).toBe(false)
    expect(a.fruitSnacksOver).toEqual(['2026-10-07|spuntino-mattina'])
    expect(a.avoided.map((e) => e.foodId)).toEqual(['aglio'])
    expect(a.portionExceeded.map((e) => e.foodId)).toEqual(['fragole'])
  })
})
