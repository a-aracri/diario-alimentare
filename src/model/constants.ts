import type {
  FoodCategory,
  FoodStatus,
  FoodTag,
  MealId,
  ReintroResult,
  SymptomType,
  TimeHM,
  Unit,
} from './types'

export const MEALS: { id: MealId; label: string; defaultTime: TimeHM }[] = [
  { id: 'colazione', label: 'Colazione', defaultTime: '08:00' },
  { id: 'spuntino-mattina', label: 'Spuntino mattina', defaultTime: '10:30' },
  { id: 'pranzo', label: 'Pranzo', defaultTime: '13:00' },
  { id: 'spuntino-pomeriggio', label: 'Spuntino pomeriggio', defaultTime: '16:30' },
  { id: 'cena', label: 'Cena', defaultTime: '20:00' },
  { id: 'fuori-pasto', label: 'Fuori pasto', defaultTime: '11:00' },
]

export const MEAL_LABEL: Record<MealId, string> = Object.fromEntries(
  MEALS.map((m) => [m.id, m.label]),
) as Record<MealId, string>

export const SNACK_MEALS: MealId[] = ['spuntino-mattina', 'spuntino-pomeriggio']

export const UNITS: { id: Unit; label: string; short: string }[] = [
  { id: 'g', label: 'grammi', short: 'g' },
  { id: 'ml', label: 'millilitri', short: 'ml' },
  { id: 'cucchiai', label: 'cucchiai', short: 'cucchiai' },
  { id: 'cucchiaini', label: 'cucchiaini', short: 'cucchiaini' },
  { id: 'pezzi', label: 'pezzi', short: 'pz' },
  { id: 'fette', label: 'fette', short: 'fette' },
  { id: 'porzioni', label: 'porzioni', short: 'porz.' },
]

export const STATUS_LABEL: Record<FoodStatus, string> = {
  permesso: 'Permesso',
  limite: 'Con limite',
  evitare: 'Da evitare',
  verificare: 'Da verificare',
}

export const CATEGORY_LABEL: Record<FoodCategory, string> = {
  cereali: 'Cereali e carboidrati',
  proteine: 'Carne, pesce e uova',
  latticini: 'Latte e latticini',
  legumi: 'Legumi',
  'noci-semi': 'Noci e semi',
  verdure: 'Verdure',
  erbe: 'Erbe aromatiche e spezie',
  frutta: 'Frutta',
  condimenti: 'Condimenti',
  bevande: 'Bevande',
  dolci: 'Dolci e dolcificanti',
  piatti: 'Piatti e ricette del piano',
  altro: 'Altro',
}

export const SYMPTOMS: { id: SymptomType; label: string }[] = [
  { id: 'gonfiore', label: 'Gonfiore' },
  { id: 'dolore', label: 'Dolore addominale' },
  { id: 'gas', label: 'Gas' },
  { id: 'diarrea', label: 'Diarrea' },
  { id: 'stitichezza', label: 'Stitichezza' },
  { id: 'reflusso', label: 'Reflusso / bruciore' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'stanchezza', label: 'Stanchezza' },
  { id: 'altro', label: 'Altro' },
  { id: 'feci', label: 'Feci (Bristol)' },
]

export const SYMPTOM_LABEL: Record<SymptomType, string> = Object.fromEntries(
  SYMPTOMS.map((s) => [s.id, s.label]),
) as Record<SymptomType, string>

export const BRISTOL: { type: number; label: string }[] = [
  { type: 1, label: 'Grumi duri e separati, difficili da evacuare' },
  { type: 2, label: 'A forma di salsiccia, ma grumosa' },
  { type: 3, label: 'A salsiccia, con crepe in superficie' },
  { type: 4, label: 'A salsiccia o serpente, liscia e morbida' },
  { type: 5, label: 'Pezzi morbidi con bordi netti' },
  { type: 6, label: 'Pezzi soffici e frastagliati, pastosa' },
  { type: 7, label: 'Acquosa, senza pezzi solidi' },
]

export const REINTRO_RESULT_LABEL: Record<ReintroResult, string> = {
  tollerato: 'Tollerato',
  parziale: 'Parzialmente tollerato',
  'non-tollerato': 'Non tollerato',
}

/** Etichette dei tag sconsigliati in fase acuta di gastrite/reflusso. */
export const ACUTE_TAG_LABEL: Partial<Record<FoodTag, string>> = {
  agrumi: 'agrumi',
  cioccolato: 'cioccolato',
  te: 'tè non deteinato',
  caffe: 'caffè non decaffeinato',
  menta: 'menta',
  'succo-frutta': 'succhi di frutta',
}
