import type { Settings } from '@/model/types'
import { db } from './db'
import { nowISO } from './helpers'
import { defaultSettings } from './seed'

export const settingsRepo = {
  async get(): Promise<Settings> {
    return (await db.settings.get('app')) ?? defaultSettings()
  },

  async update(patch: Partial<Omit<Settings, 'id' | 'updatedAt'>>): Promise<void> {
    const current = await settingsRepo.get()
    await db.settings.put({ ...current, ...patch, id: 'app', updatedAt: nowISO() })
  },
}
