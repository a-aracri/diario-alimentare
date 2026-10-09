/**
 * Layer di accesso ai dati. Le pagine e i componenti usano solo `repo` (o gli
 * hook in src/hooks/use-data.ts), mai Dexie direttamente: così si può
 * aggiungere una sincronizzazione remota senza toccare la UI.
 */
import { clearAllData, exportBackup, parseBackup, restoreBackup } from './backup'
import { entriesRepo } from './entries'
import { foodsRepo } from './foods'
import { reintroRepo } from './reintro'
import { ensureSeed } from './seed'
import { settingsRepo } from './settings'
import { supplementsRepo } from './supplements'
import { dayLogsRepo, symptomsRepo } from './symptoms'

export const repo = {
  init: ensureSeed,
  foods: foodsRepo,
  entries: entriesRepo,
  symptoms: symptomsRepo,
  dayLogs: dayLogsRepo,
  supplements: supplementsRepo,
  reintro: reintroRepo,
  settings: settingsRepo,
  backup: {
    export: exportBackup,
    parse: parseBackup,
    restore: restoreBackup,
    clearAll: clearAllData,
  },
}

export type { EntryInput } from './entries'
export type { FoodInput } from './foods'
export type { ReintroInput } from './reintro'
export type { SupplementInput } from './supplements'
export type { SymptomInput } from './symptoms'
export { BackupError, type BackupFile } from './backup'
