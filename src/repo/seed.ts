import { SEED_FOODS } from '@/data/fodmap'
import { DEFAULT_LIMITS, DEFAULT_REINTRO_GROUPS, DEFAULT_SUPPLEMENTS } from '@/data/piano'
import { today } from '@/lib/dates'
import type { Settings } from '@/model/types'
import { db } from './db'
import { nowISO } from './helpers'

/**
 * Incrementa quando cambiano i dati precaricati: al prossimo avvio vengono
 * aggiunti gli alimenti e gli integratori nuovi, senza toccare quelli già
 * presenti (che l'utente può aver modificato) né quelli che ha eliminato.
 */
export const SEED_VERSION = 1

export function defaultSettings(now = nowISO()): Settings {
  return {
    id: 'app',
    limits: { ...DEFAULT_LIMITS },
    acuteMode: false,
    reintroGroups: [...DEFAULT_REINTRO_GROUPS],
    createdAt: now,
    seedVersion: 0,
    updatedAt: now,
  }
}

export async function ensureSeed(): Promise<void> {
  await db.transaction('rw', [db.foods, db.supplements, db.settings, db.tombstones], async () => {
    const current = await db.settings.get('app')
    if (current && current.seedVersion >= SEED_VERSION) return
    const now = nowISO()

    const tombstones = await db.tombstones.toArray()
    const deleted = (table: string) =>
      new Set(tombstones.filter((t) => t.table === table).map((t) => t.recordId))

    const deletedFoods = deleted('foods')
    const existingFoods = new Set(await db.foods.toCollection().primaryKeys())
    await db.foods.bulkAdd(
      SEED_FOODS.filter((f) => !existingFoods.has(f.id) && !deletedFoods.has(f.id)).map((f) => ({
        ...f,
        updatedAt: now,
      })),
    )

    const deletedSupplements = deleted('supplements')
    const existingSupplements = new Set(await db.supplements.toCollection().primaryKeys())
    await db.supplements.bulkAdd(
      DEFAULT_SUPPLEMENTS.filter(
        (s) => !existingSupplements.has(s.id) && !deletedSupplements.has(s.id),
      ).map((s) => ({
        ...s,
        ...(s.mode === 'giornaliero' && { startDate: current?.dietStartDate ?? today() }),
        updatedAt: now,
      })),
    )

    const base = current ?? defaultSettings(now)
    await db.settings.put({ ...base, seedVersion: SEED_VERSION, updatedAt: now })
  })
}
