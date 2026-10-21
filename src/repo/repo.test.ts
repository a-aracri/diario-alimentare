import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { SEED_FOODS } from '@/data/fodmap'
import { DEFAULT_LIMITS, DEFAULT_SUPPLEMENTS } from '@/data/piano'
import { SEED_REVISIONS } from '@/data/seed-history'
import { SEED_SHOPPING } from '@/data/spesa'
import { BackupError, repo } from './index'
import { db } from './db'
import { SEED_VERSION } from './seed'

beforeEach(async () => {
  await db.delete()
  await db.open()
  await repo.init()
})

describe('seed', () => {
  it('carica alimenti, integratori e impostazioni al primo avvio', async () => {
    expect(await db.foods.count()).toBe(SEED_FOODS.length)
    expect((await repo.supplements.all()).map((s) => s.id)).toEqual([
      'probiotico',
      'glutagenics',
      'massigen-digestione',
    ])
    expect((await repo.settings.get()).limits.oilTbspPerDay).toBe(4)
  })

  it('non reinserisce gli alimenti eliminati né sovrascrive le modifiche', async () => {
    await repo.foods.remove('aglio')
    const riso = (await repo.foods.get('riso'))!
    await repo.foods.save({ ...riso, note: 'modificato' })
    await repo.settings.update({ seedVersion: 0 })
    await repo.init()
    expect(await repo.foods.get('aglio')).toBeUndefined()
    expect((await repo.foods.get('riso'))?.note).toBe('modificato')
  })
})

describe('correzioni dei dati precaricati', () => {
  const previous = SEED_REVISIONS.find((r) => r.version === 2)!
  const old = (id: string) => ({ ...previous.foods!.find((f) => f.id === id)!, updatedAt: '2026-10-01T00:00:00.000Z' })

  /** Simula un dispositivo con i dati della versione 1. */
  async function fromVersion1() {
    await repo.settings.update({ seedVersion: 1 })
    await repo.init()
  }

  it('lo storico punta a dati esistenti e a versioni già rilasciate', () => {
    for (const r of SEED_REVISIONS) {
      expect(r.version).toBeLessThanOrEqual(SEED_VERSION)
      for (const f of r.foods ?? []) expect(SEED_FOODS.map((s) => s.id)).toContain(f.id)
      for (const s of r.supplements ?? []) expect(DEFAULT_SUPPLEMENTS.map((d) => d.id)).toContain(s.id)
      for (const i of r.shopping ?? []) expect(SEED_SHOPPING.map((s) => s.id)).toContain(i.id)
    }
  })

  it('aggiorna gli alimenti non modificati e toglie i campi rimossi', async () => {
    await db.foods.put(old('melanzane'))
    await db.foods.put({ ...old('cavolo-kale'), favorite: true })
    await fromVersion1()
    expect(await repo.foods.get('melanzane')).toMatchObject({
      status: 'limite',
      maxPortion: { amount: 100, unit: 'g' },
    })
    expect((await repo.foods.get('melanzane'))?.note).toBeUndefined()
    const kale = await repo.foods.get('cavolo-kale')
    expect(kale?.aliases).toBeUndefined()
    expect(kale?.favorite).toBe(true)
  })

  it('non tocca gli alimenti modificati né reinserisce quelli eliminati', async () => {
    await db.foods.put({ ...old('ciliegie'), note: 'le peso sempre' })
    await repo.foods.remove('more')
    await fromVersion1()
    expect(await repo.foods.get('ciliegie')).toMatchObject({ status: 'verificare', note: 'le peso sempre' })
    expect(await repo.foods.get('more')).toBeUndefined()
  })

  it('porta a 8 le uova a settimana solo se il limite era quello del piano', async () => {
    await repo.settings.update({ seedVersion: 3, limits: { ...DEFAULT_LIMITS, eggsPerWeek: 6 } })
    await repo.init()
    expect((await repo.settings.get()).limits).toEqual(DEFAULT_LIMITS)

    await repo.settings.update({ seedVersion: 3, limits: { ...DEFAULT_LIMITS, eggsPerWeek: 7, oilTbspPerDay: 3 } })
    await repo.init()
    expect((await repo.settings.get()).limits).toMatchObject({ eggsPerWeek: 7, oilTbspPerDay: 3 })
  })

  it('aggiorna patate e uova e aggiunge i nuovi alimenti della colazione', async () => {
    const v4 = SEED_REVISIONS.find((r) => r.version === 4)!
    for (const id of ['patate', 'uova']) {
      await db.foods.put({ ...v4.foods!.find((f) => f.id === id)!, updatedAt: '2026-10-01T00:00:00.000Z' })
    }
    await db.foods.delete('tahina')
    await repo.settings.update({ seedVersion: 3 })
    await repo.init()
    expect((await repo.foods.get('patate'))?.maxPortion).toEqual({ amount: 250, unit: 'g' })
    expect((await repo.foods.get('uova'))?.note).toContain('Max 8')
    expect(await repo.foods.get('tahina')).toMatchObject({ maxPortion: { amount: 11, unit: 'g' } })
  })

  it('aggiorna la nota dei latticini delattosati solo se non modificata', async () => {
    const v5 = SEED_REVISIONS.find((r) => r.version === 5)!
    const old = (id: string) => ({ ...v5.foods!.find((f) => f.id === id)!, updatedAt: '2026-10-01T00:00:00.000Z' })
    await db.foods.put(old('yogurt-delattosato'))
    await db.foods.put({ ...old('latte-delattosato'), note: 'quello senza zucchero' })
    await repo.settings.update({ seedVersion: 4 })
    await repo.init()
    expect((await repo.foods.get('yogurt-delattosato'))?.note).toContain('negli spuntini non conta')
    expect((await repo.foods.get('latte-delattosato'))?.note).toBe('quello senza zucchero')
  })

  it('aggiorna l\'integratore mantenendo la data di inizio', async () => {
    const glutagenics = previous.supplements!.find((s) => s.id === 'glutagenics')!
    await db.supplements.put({ ...glutagenics, startDate: '2026-10-01', updatedAt: '2026-10-01T00:00:00.000Z' })
    await fromVersion1()
    expect(await db.supplements.get('glutagenics')).toMatchObject({
      timing: 'Prima di colazione',
      reminderTime: '07:30',
      startDate: '2026-10-01',
    })
  })
})

describe('lista della spesa', () => {
  it('si carica anche sui dispositivi già in uso e rispetta le eliminazioni', async () => {
    expect(await db.shopping.count()).toBe(SEED_SHOPPING.length)
    await db.shopping.clear()
    await repo.settings.update({ seedVersion: 2 })
    await repo.init()
    expect(await db.shopping.count()).toBe(SEED_SHOPPING.length)

    await repo.shopping.remove('riso')
    await repo.settings.update({ seedVersion: 2 })
    await repo.init()
    expect(await db.shopping.get('riso')).toBeUndefined()
  })

  it('segna ce l\'ho / mi serve e torna da segnare', async () => {
    await repo.shopping.setStatus('olio-evo', 'serve')
    expect((await db.shopping.get('olio-evo'))?.status).toBe('serve')
    await repo.shopping.setStatus('olio-evo', 'ho')
    expect((await db.shopping.get('olio-evo'))?.status).toBe('ho')
    await repo.shopping.setStatus('olio-evo', undefined)
    expect(await db.shopping.get('olio-evo')).not.toHaveProperty('status')
  })

  it('aggiunge voci personali', async () => {
    const item = await repo.shopping.save({ name: 'Carta forno', section: 'altro', status: 'serve', custom: true })
    expect((await repo.shopping.all()).find((i) => i.id === item.id)).toMatchObject({ name: 'Carta forno' })
  })
})

describe('voci del diario', () => {
  it('ripete un pasto dal giorno precedente', async () => {
    await repo.entries.save({ date: '2026-10-08', meal: 'pranzo', time: '13:00', foodId: 'riso', name: 'Riso', quantity: 80, unit: 'g' })
    await repo.entries.save({ date: '2026-10-08', meal: 'cena', time: '20:00', foodId: 'pollo', name: 'Pollo' })
    expect(await repo.entries.repeatFromPreviousDay('2026-10-09', 'pranzo')).toBe(1)
    const copied = await repo.entries.byDate('2026-10-09')
    expect(copied).toHaveLength(1)
    expect(copied[0]).toMatchObject({ meal: 'pranzo', foodId: 'riso', quantity: 80 })
  })

  it('registra una tombstone quando elimina', async () => {
    const e = await repo.entries.save({ date: '2026-10-09', meal: 'cena', time: '20:00', name: 'Pollo' })
    await repo.entries.remove(e.id)
    expect(await db.tombstones.get(`entries:${e.id}`)).toBeDefined()
  })
})

describe('sintomi', () => {
  it('un sintomo toglie "nessun sintomo oggi", le feci no', async () => {
    await repo.dayLogs.update('2026-10-09', { noSymptoms: true })
    await repo.symptoms.save({ date: '2026-10-09', time: '09:00', type: 'feci', bristol: 4 })
    expect((await repo.dayLogs.get('2026-10-09'))?.noSymptoms).toBe(true)
    await repo.symptoms.save({ date: '2026-10-09', time: '10:00', type: 'gonfiore', intensity: 3 })
    expect((await repo.dayLogs.get('2026-10-09'))?.noSymptoms).toBe(false)
  })
})

describe('backup', () => {
  it('esporta e ripristina tutti i dati', async () => {
    await repo.entries.save({ date: '2026-10-09', meal: 'colazione', time: '08:00', name: 'Tisana', foodId: 'tisana' })
    await repo.settings.update({ dietStartDate: '2026-10-01' })
    const text = JSON.stringify(await repo.backup.export())

    await repo.backup.clearAll()
    expect(await db.entries.count()).toBe(0)

    await repo.backup.restore(repo.backup.parse(text))
    expect(await db.entries.count()).toBe(1)
    expect((await repo.settings.get()).dietStartDate).toBe('2026-10-01')
    expect(await db.foods.count()).toBe(SEED_FOODS.length)
  })

  it('ripristina un backup della versione 1, senza lista della spesa', async () => {
    await repo.shopping.setStatus('riso', 'serve')
    const backup = await repo.backup.export()
    const { shopping: _, ...data } = backup.data
    const v1 = { ...backup, version: 1, data: { ...data, settings: [{ ...(await repo.settings.get()), seedVersion: 2 }] } }

    await repo.backup.restore(repo.backup.parse(JSON.stringify(v1)))
    expect(await db.shopping.count()).toBe(SEED_SHOPPING.length)
    expect((await db.shopping.get('riso'))?.status).toBeUndefined()
  })

  it('rifiuta file non validi', () => {
    expect(() => repo.backup.parse('non json')).toThrow(BackupError)
    expect(() => repo.backup.parse('{"app":"altro"}')).toThrow(BackupError)
    expect(() =>
      repo.backup.parse(JSON.stringify({ app: 'diario-alimentare', version: 1, data: { entries: [{}] } })),
    ).toThrow(BackupError)
  })
})
