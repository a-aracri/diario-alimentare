import { describe, expect, it } from 'vitest'
import { SEED_FOODS } from '@/data/fodmap'
import { SUGGESTIONS } from '@/data/piano'
import { foods } from '@/test/fixtures'
import type { Supplement } from '@/model/types'
import { toCSV } from './csv'
import { addDays, dateRange, diffDays, weekStart } from './dates'
import { searchFoods } from './foods'
import { isReminderDue, supplementStatus } from './supplements'

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
    expect(toCheck).toEqual(expect.arrayContaining(['ciliegie', 'more', 'mais-dolce', 'pistacchi', 'melanzane']))
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
