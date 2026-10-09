import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { SEED_FOODS } from '@/data/fodmap'
import { BackupError, repo } from './index'
import { db } from './db'

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

  it('rifiuta file non validi', () => {
    expect(() => repo.backup.parse('non json')).toThrow(BackupError)
    expect(() => repo.backup.parse('{"app":"altro"}')).toThrow(BackupError)
    expect(() =>
      repo.backup.parse(JSON.stringify({ app: 'diario-alimentare', version: 1, data: { entries: [{}] } })),
    ).toThrow(BackupError)
  })
})
