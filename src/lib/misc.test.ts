import { describe, expect, it } from 'vitest'
import { SEED_FOODS } from '@/data/fodmap'
import { DEFAULT_LIMITS, SUGGESTIONS } from '@/data/piano'
import { SEED_SHOPPING } from '@/data/spesa'
import { foods, index } from '@/test/fixtures'
import type { ShoppingItem, Supplement } from '@/model/types'
import { toCSV } from './csv'
import { addDays, dateRange, diffDays, guessMeal, isBackupDue, isBackupReminderDue, weekStart } from './dates'
import { freeTextName, groupLabelAt, searchFoods, sortForList } from './foods'
import { exceedsPortion, hasTag } from './limits'
import { groupShopping, shoppingCounts } from './shopping'
import { isReminderDue, supplementStatus } from './supplements'
import { toEggs } from './units'

describe('dati del piano', () => {
  it('gli id degli alimenti sono unici', () => {
    const ids = SEED_FOODS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('i suggerimenti puntano ad alimenti esistenti', () => {
    const ids = new Set(SEED_FOODS.map((f) => f.id))
    for (const s of SUGGESTIONS) {
      for (const item of s.items) {
        for (const c of item.choices) expect(ids, `${s.id} → ${c.foodId}`).toContain(c.foodId)
      }
    }
  })

  it('contiene gli alimenti da verificare indicati', () => {
    const toCheck = SEED_FOODS.filter((f) => f.status === 'verificare').map((f) => f.id)
    expect(toCheck).toEqual(expect.arrayContaining(['mais-dolce', 'pistacchi']))
  })

  it('include le indicazioni aggiuntive della nutrizionista', () => {
    const food = (id: string) => SEED_FOODS.find((f) => f.id === id)
    for (const [id, grams] of [
      ['melanzane', 100],
      ['cavolo-nero', 75],
      ['broccoletti', 75],
      ['ciliegie', 20],
      ['more', 32],
    ] as const) {
      expect(food(id), id).toMatchObject({ status: 'limite', maxPortion: { amount: grams, unit: 'g' } })
    }
    expect(food('yogurt-greco-delattosato')?.tags).toContain('latticino-delattosato')
    expect(food('polioli')?.status).toBe('evitare')
    expect(searchFoods(foods, 'sorbitolo')[0]?.id).toBe('polioli')
    expect(searchFoods(foods, 'cavolo nero')[0]?.id).toBe('cavolo-nero')
  })

  it('include le regole aggiornate su uova, patate, tahina e arachidi', () => {
    const food = (id: string) => index.byId.get(id)
    expect(DEFAULT_LIMITS.eggsPerWeek).toBe(8)
    expect(food('patate')?.maxPortion).toEqual({ amount: 250, unit: 'g' })
    expect(food('tahina')?.maxPortion).toEqual({ amount: 11, unit: 'g' })
    expect(food('arachidi')?.status).toBe('evitare')
    expect(searchFoods(foods, 'burro di arachidi')[0]?.id).toBe('arachidi')
    expect(searchFoods(foods, 'tahini')[0]?.id).toBe('tahina')
  })
})

describe('colazioni del piano', () => {
  const colazioni = SUGGESTIONS.filter((s) => s.kind === 'colazione')
  const choices = colazioni.flatMap((s) => s.items.flatMap((i) => i.choices.map((c) => ({ s, c }))))

  it('sono le opzioni A–E divise per categoria', () => {
    expect(colazioni.map((s) => `${s.group} ${s.title.split('.')[0]}`)).toEqual([
      'Veloce A',
      'Overnight B1',
      'Overnight B2',
      'Overnight B3',
      'Overnight B4',
      'Con cottura C',
      'Salata D',
      'Salata E',
    ])
    for (const s of colazioni) expect(s.ingredients?.length, s.id).toBeGreaterThan(0)
  })

  it('le uova indicate sono quelle che finiscono nel diario, qualunque alternativa si scelga', () => {
    for (const s of colazioni) {
      let eggs = 0
      for (const item of s.items.filter((i) => !i.optional)) {
        const counts = item.choices.map((c) =>
          hasTag(index.byId.get(c.foodId), 'uovo') ? toEggs(c.quantity, c.unit) : 0,
        )
        expect(new Set(counts).size, s.id).toBe(1)
        eggs += counts[0]
      }
      expect(eggs, s.id).toBe(s.eggs)
    }
    expect(colazioni.map((s) => s.eggs)).toEqual([0, 0, 0, 0, 0, 1, 2, 2])
  })

  it('usano solo alimenti consentiti, nelle porzioni del piano', () => {
    for (const { s, c } of choices) {
      const food = index.byId.get(c.foodId)
      expect(['permesso', 'limite'], `${s.id} → ${c.foodId}`).toContain(food?.status)
      expect(exceedsPortion(c, food), `${s.id} → ${c.foodId}`).toBe(false)
    }
  })

  it('niente patate, burro di arachidi, hummus né pane con olive e cetrioli', () => {
    const ids = choices.map(({ c }) => c.foodId)
    for (const id of ['patate', 'fecola-di-patate', 'arachidi', 'ceci', 'olive-verdi', 'olive-nere']) {
      expect(ids).not.toContain(id)
    }
    const text = colazioni.map((s) => [s.title, ...(s.ingredients ?? [])].join(' ').toLowerCase()).join(' ')
    for (const word of ['patat', 'burro di arachidi', 'hummus', 'ceci', 'olive']) expect(text).not.toContain(word)
  })

  it('segnala la dose dei fiocchi di quinoa e la tahina da confermare', () => {
    const flags = (id: string) => colazioni.find((s) => s.id === id)?.flags?.map((f) => f.text).join(' ')
    expect(flags('colazione-b4-fiocchi-di-quinoa')).toContain('da verificare con la nutrizionista')
    expect(flags('colazione-a-bevanda-e-biscotti')).toContain('max 11 g')
  })
})

describe('date', () => {
  it('la settimana inizia di lunedì', () => {
    expect(weekStart('2026-10-09')).toBe('2026-10-05') // venerdì
    expect(weekStart('2026-10-05')).toBe('2026-10-05') // lunedì
    expect(weekStart('2026-10-11')).toBe('2026-10-05') // domenica
  })

  it('gestisce cambi di mese e ora legale', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-10-24', 7)).toBe('2026-10-31')
    expect(diffDays('2026-10-20', '2026-10-30')).toBe(10)
    expect(dateRange('2026-10-24', '2026-10-27')).toHaveLength(4)
  })
})

describe('ricerca alimenti', () => {
  it('ignora accenti e maiuscole', () => {
    expect(searchFoods(foods, 'CAFFE').map((f) => f.id)).toContain('caffe')
  })

  it('trova per sinonimo', () => {
    expect(searchFoods(foods, 'latte di riso')[0].id).toBe('bevanda-di-riso')
  })

  it('mette prima le corrispondenze a inizio nome', () => {
    expect(searchFoods(foods, 'riso')[0].id).toBe('riso')
  })
})

describe('testo libero', () => {
  it('unisce le righe in un elenco con le virgole', () => {
    expect(freeTextName('Pizza margherita senza glutine\n\n  acqua frizzante  ')).toBe(
      'Pizza margherita senza glutine, acqua frizzante',
    )
  })

  it('non raddoppia la punteggiatura a fine riga', () => {
    expect(freeTextName('riso,\r\nzucchine grigliate;\npollo')).toBe('riso, zucchine grigliate, pollo')
  })

  it('dopo i due punti o il punto continua con uno spazio', () => {
    expect(freeTextName('Al ristorante:\nriso\nacqua')).toBe('Al ristorante: riso, acqua')
    expect(freeTextName('Riso in bianco.\nPoi un caffè')).toBe('Riso in bianco. Poi un caffè')
  })

  it('lascia com’è una riga sola', () => {
    expect(freeTextName('  Sushi: nigiri di salmone, edamame  ')).toBe('Sushi: nigiri di salmone, edamame')
  })
})

describe('integratori', () => {
  const probiotico: Supplement = {
    id: 'p',
    name: 'Probiotico',
    timing: 'Dopo cena',
    mode: 'giornaliero',
    startDate: '2026-10-01',
    durationDays: 30,
    afterDuration: 'al-bisogno',
    reminderTime: '21:00',
    order: 1,
    updatedAt: '',
  }

  it('è giornaliero durante la durata e poi al bisogno', () => {
    expect(supplementStatus(probiotico, '2026-09-30').state).toBe('non-iniziato')
    expect(supplementStatus(probiotico, '2026-10-01')).toMatchObject({ state: 'giornaliero', day: 1 })
    expect(supplementStatus(probiotico, '2026-10-30')).toMatchObject({ state: 'giornaliero', day: 30 })
    expect(supplementStatus(probiotico, '2026-10-31').state).toBe('al-bisogno')
  })

  it('si conclude se previsto', () => {
    expect(supplementStatus({ ...probiotico, afterDuration: 'stop' }, '2026-11-15').state).toBe('concluso')
  })

  it('evidenzia il promemoria dopo l’orario indicato', () => {
    const at = (h: number) => new Date(2026, 9, 9, h, 0)
    expect(isReminderDue(probiotico, '2026-10-09', false, at(20))).toBe(false)
    expect(isReminderDue(probiotico, '2026-10-09', false, at(22))).toBe(true)
    expect(isReminderDue(probiotico, '2026-10-09', true, at(22))).toBe(false)
    expect(isReminderDue(probiotico, '2026-10-08', false, at(8))).toBe(true)
  })
})

describe('CSV', () => {
  it('usa il punto e virgola e protegge i campi', () => {
    expect(toCSV([['a;b', 'c"d', 1.5, null, '=SOMMA(1)']])).toBe('"a;b";"c""d";1,5;;\'=SOMMA(1)')
  })
})

describe('promemoria backup', () => {
  const now = new Date('2026-10-09T12:00:00Z')
  it('scatta dopo 7 giorni dall’ultimo backup', () => {
    expect(isBackupDue('2026-10-01T12:00:00Z', '2026-09-01T00:00:00Z', now)).toBe(true)
    expect(isBackupDue('2026-10-03T12:00:00Z', '2026-09-01T00:00:00Z', now)).toBe(false)
  })
  it('senza backup usa la data del primo avvio', () => {
    expect(isBackupDue(undefined, '2026-10-05T00:00:00Z', now)).toBe(false)
    expect(isBackupDue(undefined, '2026-09-30T00:00:00Z', now)).toBe(true)
  })
  it('"Non ora" nasconde il promemoria per 7 giorni', () => {
    const due = (snoozedAt?: string) => isBackupReminderDue(undefined, '2026-09-01T00:00:00Z', snoozedAt, now)
    expect(due()).toBe(true)
    expect(due('2026-10-06T12:00:00Z')).toBe(false)
    expect(due('2026-10-01T12:00:00Z')).toBe(true)
    expect(isBackupReminderDue('2026-10-08T12:00:00Z', '2026-09-01T00:00:00Z', undefined, now)).toBe(false)
  })
})

describe('pasto suggerito', () => {
  it('sceglie il pasto in base all’orario', () => {
    expect(guessMeal('07:30')).toBe('colazione')
    expect(guessMeal('13:10')).toBe('pranzo')
    expect(guessMeal('16:00')).toBe('spuntino-pomeriggio')
    expect(guessMeal('23:00')).toBe('fuori-pasto')
  })
})

describe('ordine delle liste di alimenti', () => {
  const verdure = foods.filter((f) => f.category === 'verdure')
  const sorted = sortForList(verdure)

  it('mette prima i consentiti, poi da verificare, in fondo da evitare', () => {
    const groups = sorted.map((f) => f.status === 'evitare' ? 2 : f.status === 'verificare' ? 1 : 0)
    expect(groups).toEqual([...groups].sort((a, b) => a - b))
    expect(sorted.at(-1)?.status).toBe('evitare')
    expect(sorted[0].status).not.toBe('evitare')
  })

  it('è alfabetico dentro ogni gruppo, con permessi e con limite insieme', () => {
    const allowed = sorted.filter((f) => f.status === 'permesso' || f.status === 'limite').map((f) => f.name)
    expect(allowed).toEqual([...allowed].sort((a, b) => a.localeCompare(b, 'it')))
    expect(allowed.slice(0, 3)).toEqual(['Bietole', 'Broccoletti', 'Broccoli (solo teste)'])
  })

  it('mostra un’etichetta solo dove cambia gruppo', () => {
    const labels = sorted.map((_, i) => groupLabelAt(sorted, i)).filter(Boolean)
    expect(labels).toEqual(['Da verificare', 'Da evitare'])
  })
})

describe('lista della spesa', () => {
  it('ha id unici e solo alimenti consentiti dal piano', () => {
    const ids = SEED_SHOPPING.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    const foodById = new Map(SEED_FOODS.map((f) => [f.id, f]))
    for (const item of SEED_SHOPPING) {
      const food = foodById.get(item.id)
      if (food) expect(['permesso', 'limite'], item.id).toContain(food.status)
    }
    expect(ids).toEqual(expect.arrayContaining(['pasta-senza-glutine', 'olio-evo', 'integratore-probiotico']))
  })

  const item = (id: string, section: ShoppingItem['section'], status?: ShoppingItem['status']): ShoppingItem => ({
    id,
    name: id,
    section,
    status,
    updatedAt: '',
  })
  const items = [
    item('zucchine', 'verdura', 'serve'),
    item('carote', 'verdura', 'ho'),
    item('riso', 'pane-pasta', 'serve'),
    item('basilico', 'erbe-spezie'),
  ]

  it('conta e filtra per stato, per reparto e in ordine alfabetico', () => {
    expect(shoppingCounts(items)).toEqual({ serve: 2, ho: 1, tutto: 4 })
    expect(groupShopping(items, 'serve').map((g) => [g.section, g.items.map((i) => i.id)])).toEqual([
      ['verdura', ['zucchine']],
      ['pane-pasta', ['riso']],
    ])
    expect(groupShopping(items, 'tutto')[0].items.map((i) => i.id)).toEqual(['carote', 'zucchine'])
  })

  it('cerca ignorando maiuscole e accenti', () => {
    const groups = groupShopping([...items, { ...item('te', 'bevande'), name: 'Tè verde' }], 'tutto', 'TE V')
    expect(groups.flatMap((g) => g.items.map((i) => i.id))).toEqual(['te'])
  })
})
