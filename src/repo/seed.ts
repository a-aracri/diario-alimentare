import { SEED_FOODS } from '@/data/fodmap'
import { DEFAULT_LIMITS, DEFAULT_REINTRO_GROUPS, DEFAULT_SUPPLEMENTS } from '@/data/piano'
import { SEED_REVISIONS } from '@/data/seed-history'
import { SEED_SHOPPING } from '@/data/spesa'
import { today } from '@/lib/dates'
import type { Limits, Settings } from '@/model/types'
import { db } from './db'
import { nowISO } from './helpers'

/**
 * Incrementa quando cambiano i dati precaricati: al prossimo avvio vengono
 * aggiunti gli alimenti, gli integratori e le voci della lista della spesa
 * nuovi, senza toccare quelli che l'utente ha eliminato. Quelli già presenti
 * (e i limiti) cambiano solo se corretti in src/data/seed-history.ts e non
 * modificati dall'utente.
 */
export const SEED_VERSION = 7

/** Campi che vengono dal seed; gli altri (preferito, data di inizio…) sono dell'utente. */
const FOOD_FIELDS = ['name', 'category', 'status', 'maxPortion', 'note', 'tags', 'aliases'] as const
const SUPPLEMENT_FIELDS = [
  'name',
  'timing',
  'mode',
  'durationDays',
  'afterDuration',
  'reminderTime',
  'note',
  'order',
] as const
const SHOPPING_FIELDS = ['name', 'section', 'note'] as const

/** Confronto per valore che ignora l'ordine delle chiavi e i campi `undefined`. */
function sameValue(a: unknown, b: unknown): boolean {
  const stable = (v: unknown) =>
    JSON.stringify(v, (_, x) =>
      x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x,
    )
  return stable(a) === stable(b)
}

/**
 * Porta ai valori attuali del seed i record ancora identici a una loro
 * versione precedente, cioè non modificati dall'utente.
 */
async function applyRevisions<S extends { id: string }, T extends S & { updatedAt: string }>(
  table: { get(id: string): PromiseLike<T | undefined>; put(record: T): PromiseLike<unknown> },
  current: S[],
  previous: S[],
  fields: readonly (keyof S)[],
  now: string,
): Promise<void> {
  const latest = new Map(current.map((s) => [s.id, s]))
  for (const old of previous) {
    const next = latest.get(old.id)
    const record = await table.get(old.id)
    if (!next || !record) continue
    if (!fields.every((k) => sameValue(record[k], old[k]))) continue
    const updated: T = { ...record, ...next, updatedAt: now }
    // I campi tolti dal seed (es. un sinonimo eliminato) spariscono anche dal record.
    for (const k of fields) if (next[k] === undefined) delete updated[k]
    await table.put(updated)
  }
}

/** Porta ai valori del piano i limiti ancora uguali a un loro valore precedente. */
function reviseLimits(limits: Limits, previous: Partial<Limits>[]): Limits {
  const out = { ...limits }
  for (const old of previous) {
    for (const key of Object.keys(old) as (keyof Limits)[]) {
      if (out[key] === old[key]) out[key] = DEFAULT_LIMITS[key]
    }
  }
  return out
}

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
  await db.transaction('rw', [db.foods, db.supplements, db.shopping, db.settings, db.tombstones], async () => {
    const current = await db.settings.get('app')
    if (current && current.seedVersion >= SEED_VERSION) return
    const now = nowISO()

    const tombstones = await db.tombstones.toArray()
    const deleted = (table: string) =>
      new Set(tombstones.filter((t) => t.table === table).map((t) => t.recordId))

    const revisions = current ? SEED_REVISIONS.filter((r) => r.version > current.seedVersion) : []
    await applyRevisions(
      db.foods,
      SEED_FOODS,
      revisions.flatMap((r) => r.foods ?? []),
      FOOD_FIELDS,
      now,
    )
    await applyRevisions(
      db.supplements,
      DEFAULT_SUPPLEMENTS,
      revisions.flatMap((r) => r.supplements ?? []),
      SUPPLEMENT_FIELDS,
      now,
    )
    await applyRevisions(
      db.shopping,
      SEED_SHOPPING,
      revisions.flatMap((r) => r.shopping ?? []),
      SHOPPING_FIELDS,
      now,
    )

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

    const deletedShopping = deleted('shopping')
    const existingShopping = new Set(await db.shopping.toCollection().primaryKeys())
    await db.shopping.bulkAdd(
      SEED_SHOPPING.filter((i) => !existingShopping.has(i.id) && !deletedShopping.has(i.id)).map((i) => ({
        ...i,
        updatedAt: now,
      })),
    )

    const base = current
      ? { ...current, limits: reviseLimits(current.limits, revisions.flatMap((r) => r.limits ?? [])) }
      : defaultSettings(now)
    await db.settings.put({ ...base, seedVersion: SEED_VERSION, updatedAt: now })
  })
}
