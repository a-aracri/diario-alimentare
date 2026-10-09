/**
 * Modello dati dell'app. Tutti i record persistiti hanno un `id` stringa
 * (UUID o slug stabile per i dati precaricati) e `updatedAt` ISO, così una
 * futura sincronizzazione può fare merge per record.
 */

/** Data locale nel formato YYYY-MM-DD. */
export type ISODate = string
/** Orario locale nel formato HH:MM. */
export type TimeHM = string

export type FoodStatus = 'permesso' | 'limite' | 'evitare' | 'verificare'

export type FoodCategory =
  | 'cereali'
  | 'proteine'
  | 'latticini'
  | 'legumi'
  | 'noci-semi'
  | 'verdure'
  | 'erbe'
  | 'frutta'
  | 'condimenti'
  | 'bevande'
  | 'dolci'
  | 'piatti'
  | 'altro'

export type Unit = 'g' | 'ml' | 'cucchiai' | 'cucchiaini' | 'pezzi' | 'fette' | 'porzioni'

export interface Portion {
  amount: number
  unit: Unit
}

/**
 * Etichette che collegano un alimento ai contatori e alla modalità fase acuta.
 * - frutto: conta per "1 frutto per spuntino"
 * - uovo: conta per il limite settimanale di uova
 * - olio-evo: conta per il limite giornaliero di olio EVO
 * - latticino-delattosato: conta per il limite settimanale dei latticini delattosati
 * - agrumi, cioccolato, te, caffe, menta, succo-frutta: sconsigliati in fase acuta
 */
export type FoodTag =
  | 'frutto'
  | 'uovo'
  | 'olio-evo'
  | 'latticino-delattosato'
  | 'agrumi'
  | 'cioccolato'
  | 'te'
  | 'caffe'
  | 'menta'
  | 'succo-frutta'

export interface Food {
  id: string
  name: string
  category: FoodCategory
  status: FoodStatus
  /** Porzione massima indicata dal piano. */
  maxPortion?: Portion
  note?: string
  tags?: FoodTag[]
  /** Sinonimi usati nella ricerca. */
  aliases?: string[]
  /** true per gli alimenti aggiunti dall'utente. */
  custom?: boolean
  favorite?: boolean
  updatedAt: string
}

export type MealId =
  | 'colazione'
  | 'spuntino-mattina'
  | 'pranzo'
  | 'spuntino-pomeriggio'
  | 'cena'
  | 'fuori-pasto'

export interface Entry {
  id: string
  date: ISODate
  meal: MealId
  time: TimeHM
  /** Riferimento all'alimento del database (assente per testo libero). */
  foodId?: string
  /** Nome mostrato, copiato dall'alimento al momento dell'inserimento. */
  name: string
  quantity?: number
  unit?: Unit
  note?: string
  createdAt: string
  updatedAt: string
}

export type SymptomType =
  | 'gonfiore'
  | 'dolore'
  | 'gas'
  | 'diarrea'
  | 'stitichezza'
  | 'reflusso'
  | 'nausea'
  | 'stanchezza'
  | 'altro'
  | 'feci'

export interface Symptom {
  id: string
  date: ISODate
  time: TimeHM
  type: SymptomType
  /** Intensità 0–10 (non usata per le feci). */
  intensity?: number
  /** Scala di Bristol 1–7 (solo per le feci). */
  bristol?: number
  /** Descrizione libera quando il tipo è "altro". */
  label?: string
  note?: string
  createdAt: string
  updatedAt: string
}

/** Informazioni a livello di giornata. */
export interface DayLog {
  date: ISODate
  noSymptoms?: boolean
  note?: string
  updatedAt: string
}

export type SupplementMode = 'giornaliero' | 'al-bisogno'

export interface Supplement {
  id: string
  name: string
  /** Quando assumerlo, es. "Dopo cena". */
  timing: string
  mode: SupplementMode
  startDate?: ISODate
  /** Durata della fase giornaliera; vuota = senza scadenza. */
  durationDays?: number
  /** Cosa succede finita la durata. */
  afterDuration?: 'al-bisogno' | 'stop'
  /** Dopo quest'ora, se non spuntato, il promemoria viene evidenziato. */
  reminderTime?: TimeHM
  note?: string
  order: number
  updatedAt: string
}

export interface SupplementLog {
  /** `${supplementId}|${date}` */
  id: string
  supplementId: string
  date: ISODate
  taken: boolean
  time?: TimeHM
  updatedAt: string
}

export type ReintroResult = 'tollerato' | 'parziale' | 'non-tollerato'

export interface ReintroDay {
  date?: ISODate
  dose: string
  symptoms?: string
  /** Intensità massima dei sintomi 0–10. */
  intensity?: number
}

export interface ReintroTest {
  id: string
  group: string
  food: string
  startDate: ISODate
  days: ReintroDay[]
  result?: ReintroResult
  note?: string
  createdAt: string
  updatedAt: string
}

export interface Limits {
  /** Olio EVO: cucchiai al giorno. */
  oilTbspPerDay: number
  /** Uova: pezzi a settimana. */
  eggsPerWeek: number
  /** Latticini delattosati: grammi per porzione. */
  dairyGramsPerServing: number
  /** Latticini delattosati: volte a settimana. */
  dairyTimesPerWeek: number
  /** Frutti per spuntino. */
  fruitPerSnack: number
}

export interface Settings {
  id: 'app'
  dietStartDate?: ISODate
  limits: Limits
  acuteMode: boolean
  reintroGroups: string[]
  lastBackupAt?: string
  /** Data del primo avvio: serve per il promemoria backup. */
  createdAt: string
  seedVersion: number
  updatedAt: string
}

/** Traccia delle cancellazioni, utile per una futura sincronizzazione. */
export interface Tombstone {
  /** `${table}:${recordId}` */
  id: string
  table: string
  recordId: string
  deletedAt: string
}
