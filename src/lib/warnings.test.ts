import { describe, expect, it } from 'vitest'
import { entry, index, limits } from '@/test/fixtures'
import type { Entry } from '@/model/types'
import { evaluateEntry, type EntryDraft } from './warnings'

function codes(draft: EntryDraft, weekEntries: Entry[] = [], acuteMode = false) {
  return evaluateEntry({ draft, weekEntries, index, limits, acuteMode }).map((w) => w.code)
}

const base = { date: '2026-10-07', meal: 'pranzo' as const }
const draft = (foodId: string, extra: Partial<EntryDraft> = {}): EntryDraft => ({
  ...base,
  foodId,
  name: index.byId.get(foodId)?.name ?? foodId,
  ...extra,
})

describe('evaluateEntry: stato alimento', () => {
  it('nessun avviso per un alimento permesso entro la porzione', () => {
    expect(codes(draft('riso', { quantity: 80, unit: 'g' }))).toEqual([])
  })

  it('avvisa per un alimento da evitare, senza bloccare', () => {
    const [w] = evaluateEntry({ draft: draft('aglio'), weekEntries: [], index, limits, acuteMode: false })
    expect(w.code).toBe('evitare')
    expect(w.level).toBe('warning')
  })

  it('informa per un alimento da verificare', () => {
    const [w] = evaluateEntry({ draft: draft('ciliegie'), weekEntries: [], index, limits, acuteMode: false })
    expect(w).toMatchObject({ code: 'verificare', level: 'info' })
  })

  it('riconosce un alimento scritto a mano con lo stesso nome', () => {
    expect(codes({ ...base, name: 'Aglio' })).toEqual(['evitare'])
  })

  it('nessun avviso per testo libero sconosciuto', () => {
    expect(codes({ ...base, name: 'Piatto della nonna' })).toEqual([])
  })
})

describe('evaluateEntry: porzione', () => {
  it('avvisa se supero la porzione indicata', () => {
    expect(codes(draft('zucchine', { quantity: 100, unit: 'g' }))).toEqual(['porzione'])
  })

  it('converte i cucchiaini in cucchiai', () => {
    expect(codes(draft('semi-di-chia', { quantity: 6, unit: 'cucchiaini' }))).toEqual([])
    expect(codes(draft('semi-di-chia', { quantity: 7, unit: 'cucchiaini' }))).toEqual(['porzione'])
  })
})

describe('evaluateEntry: fase acuta', () => {
  it('segnala gli agrumi solo con la fase acuta attiva', () => {
    expect(codes(draft('arancia', { meal: 'spuntino-mattina' }), [], false)).toEqual([])
    expect(codes(draft('arancia', { meal: 'spuntino-mattina' }), [], true)).toEqual(['acuta'])
  })

  it('non segnala il tè deteinato né il decaffeinato come acuti', () => {
    expect(codes(draft('te-deteinato'), [], true)).toEqual([])
    expect(codes(draft('caffe-decaffeinato'), [], true)).toEqual(['verificare'])
  })

  it('segnala tè, caffè, cioccolato, menta e succhi', () => {
    for (const id of ['te-verde', 'caffe', 'cioccolato-fondente-85', 'menta', 'succo-di-mirtillo']) {
      expect(codes(draft(id), [], true)).toContain('acuta')
    }
  })
})

describe('evaluateEntry: limiti', () => {
  it('olio EVO: avvisa quando si supera il limite giornaliero', () => {
    const week = [entry({ foodId: 'olio-evo', quantity: 3, unit: 'cucchiai' })]
    expect(codes(draft('olio-evo', { quantity: 1, unit: 'cucchiai' }), week)).toEqual([])
    expect(codes(draft('olio-evo', { quantity: 2, unit: 'cucchiai' }), week)).toEqual(['olio'])
  })

  it('olio EVO: conta solo lo stesso giorno', () => {
    const week = [entry({ foodId: 'olio-evo', quantity: 4, unit: 'cucchiai', date: '2026-10-06' })]
    expect(codes(draft('olio-evo', { quantity: 2, unit: 'cucchiai' }), week)).toEqual([])
  })

  it('in modifica ignora la voce stessa', () => {
    const existing = entry({ foodId: 'olio-evo', quantity: 4, unit: 'cucchiai' })
    expect(
      codes(draft('olio-evo', { id: existing.id, quantity: 4, unit: 'cucchiai' }), [existing]),
    ).toEqual([])
  })

  it('uova: avvisa oltre 6 a settimana', () => {
    const week = [
      entry({ foodId: 'uova', quantity: 2, unit: 'pezzi', date: '2026-10-05' }),
      entry({ foodId: 'uova', quantity: 3, unit: 'pezzi', date: '2026-10-06' }),
    ]
    expect(codes(draft('uova', { quantity: 1, unit: 'pezzi' }), week)).toEqual([])
    expect(codes(draft('uova', { quantity: 2, unit: 'pezzi' }), week)).toEqual(['uova'])
  })

  it('latticini delattosati: avvisa alla seconda volta in settimana', () => {
    const week = [entry({ foodId: 'yogurt-delattosato', meal: 'colazione', date: '2026-10-05' })]
    expect(codes(draft('latte-delattosato', { meal: 'cena' }), week)).toEqual(['latticini-frequenza'])
  })

  it('latticini delattosati: nello stesso pasto non è una seconda volta', () => {
    const week = [entry({ foodId: 'yogurt-delattosato', quantity: 100, unit: 'g', meal: 'colazione' })]
    expect(
      codes(draft('latte-delattosato', { meal: 'colazione', quantity: 40, unit: 'ml' }), week),
    ).toEqual([])
  })

  it('latticini delattosati: avvisa oltre 150 g nel pasto', () => {
    const week = [entry({ foodId: 'yogurt-delattosato', quantity: 125, unit: 'g', meal: 'colazione' })]
    expect(
      codes(draft('latte-delattosato', { meal: 'colazione', quantity: 50, unit: 'ml' }), week),
    ).toEqual(['latticini-porzione'])
  })

  it('frutta: avvisa al secondo frutto nello stesso spuntino', () => {
    const week = [entry({ foodId: 'kiwi', meal: 'spuntino-mattina' })]
    expect(codes(draft('mirtilli', { meal: 'spuntino-mattina' }), week)).toEqual(['frutta-spuntino'])
    expect(codes(draft('mirtilli', { meal: 'spuntino-pomeriggio' }), week)).toEqual([])
  })

  it('frutta: nessun limite per frutto fuori dagli spuntini', () => {
    const week = [entry({ foodId: 'kiwi', meal: 'pranzo' })]
    expect(codes(draft('mirtilli', { meal: 'pranzo' }), week)).toEqual([])
  })

  it('può restituire più avvisi insieme', () => {
    const week = [entry({ foodId: 'kiwi', meal: 'spuntino-mattina' })]
    expect(
      codes(draft('arancia', { meal: 'spuntino-mattina', quantity: 2, unit: 'pezzi' }), week, true),
    ).toEqual(['acuta', 'porzione', 'frutta-spuntino'])
  })
})
