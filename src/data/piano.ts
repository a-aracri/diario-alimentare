/**
 * Indicazioni del piano: limiti, suggerimenti (spuntini, colazioni, idee per
 * pranzo e cena), consigli per la fase acuta, integratori e gruppi FODMAP
 * per la reintroduzione. Gli alimenti sono in ./fodmap.ts.
 *
 * Se cambi un valore di DEFAULT_LIMITS, aggiungi quello precedente in
 * ./seed-history.ts: sul dispositivo si aggiorna solo se l'utente non l'ha modificato.
 */
import type { FoodTag, Limits, MealId, Supplement, Unit } from '@/model/types'
import { SEED_FOODS } from './fodmap'

export const DEFAULT_LIMITS: Limits = {
  oilTbspPerDay: 4,
  eggsPerWeek: 8,
  dairyGramsPerServing: 150,
  dairyTimesPerWeek: 1,
  fruitPerSnack: 1,
}

export const DEFAULT_REINTRO_GROUPS = [
  'Fruttani',
  'GOS',
  'Lattosio',
  'Fruttosio',
  'Sorbitolo',
  'Mannitolo',
]

/** Numero di giorni proposto per un nuovo test di reintroduzione. */
export const DEFAULT_REINTRO_DAYS = 3

/** Integratore precaricato: la data di inizio arriva dalla data della dieta. */
export type SeedSupplement = Omit<Supplement, 'startDate' | 'updatedAt'>

export const DEFAULT_SUPPLEMENTS: SeedSupplement[] = [
  {
    id: 'probiotico',
    name: 'Probiotico (Dicoflor)',
    timing: 'Dopo cena',
    mode: 'giornaliero',
    durationDays: 30,
    afterDuration: 'al-bisogno',
    reminderTime: '21:00',
    note: 'Per 1 mese, poi al bisogno.',
    order: 1,
  },
  {
    id: 'glutagenics',
    name: 'Glutagenics',
    timing: 'Prima di colazione',
    mode: 'giornaliero',
    durationDays: 30,
    afterDuration: 'stop',
    reminderTime: '07:30',
    note: "Per 1 mese. Prendilo prima di colazione, aspetta un po' e poi fai colazione.",
    order: 2,
  },
  {
    id: 'massigen-digestione',
    name: 'Massigen Digestione',
    timing: 'Dopo un pasto impegnativo',
    mode: 'al-bisogno',
    note: 'Al bisogno.',
    order: 3,
  },
]

export const ACUTE_AVOID = [
  'Agrumi',
  'Cioccolato',
  'Tè (va bene deteinato)',
  'Caffè (va bene decaffeinato)',
  'Menta',
  'Succhi di frutta',
]

export const ACUTE_TIPS = [
  'Pasti piccoli e frequenti',
  'Preferire cibi asciutti (no minestre o liquidi)',
  'Cibi né troppo caldi né troppo freddi',
  'Masticare lentamente',
  'Non sdraiarsi subito dopo mangiato',
]

// --- Suggerimenti --------------------------------------------------------

export interface SuggestionChoice {
  foodId: string
  quantity?: number
  unit?: Unit
}

export interface SuggestionItem {
  /** Alternative tra cui scegliere; la prima è quella proposta. */
  choices: SuggestionChoice[]
  /** In alternativa a `choices`: tutti gli alimenti consentiti con questo tag. */
  fromTag?: FoodTag
  /** Voce facoltativa, non selezionata di default. */
  optional?: boolean
  /** Nota salvata sulla voce del diario, es. "Strapazzate". */
  note?: string
}

export interface SuggestionFlag {
  level: 'info' | 'warning'
  text: string
}

export type SuggestionKind = 'colazione' | 'spuntino' | 'pasto'

export interface Suggestion {
  id: string
  kind: SuggestionKind
  /** Categoria, mostrata come titolo di sezione (es. "Veloce", "Primo + secondo"). */
  group?: string
  title: string
  description?: string
  /** Ingredienti con le quantità, come li indica il piano. */
  ingredients?: string[]
  /**
   * Uova usate dall'opzione: contano nel limite settimanale perché le voci
   * aggiunte comprendono le uova (verificato in misc.test.ts).
   */
  eggs?: number
  /** Segnalazioni: da verificare con la nutrizionista (info) o a cui fare attenzione (warning). */
  flags?: SuggestionFlag[]
  items: SuggestionItem[]
  hint?: string
}

export const SUGGESTION_MEALS: Record<SuggestionKind, MealId[]> = {
  colazione: ['colazione'],
  spuntino: ['spuntino-mattina', 'spuntino-pomeriggio'],
  pasto: ['pranzo', 'cena'],
}

export const PLAN_NOTES: Record<SuggestionKind, string> = {
  colazione: 'Scegli una delle opzioni. Le uova della colazione contano nel limite della settimana.',
  spuntino: 'Mattina e pomeriggio, uno a scelta.',
  pasto:
    'Pranzo e cena: primo + secondo + contorno. Nel contorno puoi associare due verdure diverse, ognuna nella sua porzione.',
}

/** Come comporre la colazione, mostrato sopra le opzioni. */
export const BREAKFAST_GUIDE = {
  title: 'Carboidrati + parte proteica o grassa',
  parts: [
    {
      label: 'Carboidrati',
      text: 'pane senza glutine 100 g, oppure 4–5 gallette (qualsiasi cereale ammesso), oppure circa 80 g di biscotti senza glutine.',
    },
    {
      label: 'Proteine o grassi',
      text: 'uno a scelta: circa 15 g di crema (2 cucchiaini colmi), oppure 2 uova.',
    },
    { label: 'Frutta', text: 'nelle porzioni della lista degli alimenti permessi.' },
    {
      label: 'Da bere',
      text: 'con tutte le opzioni tè deteinato o tisana (escluse camomilla, finocchio, tarassaco).',
    },
  ],
  notes: [
    'Niente burro di arachidi (allergia).',
    'Niente patate a colazione: vanno a pranzo e a cena (250 g).',
    'Hummus di ceci: da chiarire con la nutrizionista (i ceci sono tra gli alimenti da evitare).',
  ],
}

/** Descrizione delle categorie, mostrata accanto al titolo di sezione. */
export const SUGGESTION_GROUP_NOTES: Record<string, string> = {
  Overnight: 'senza cottura, si prepara la sera',
  'Con cottura': 'impasto la sera prima, oppure la domenica',
  Salata: 'weekend',
}

/** Bevanda abbinabile a tutte le colazioni. */
const teOTisana: SuggestionItem = {
  optional: true,
  choices: [{ foodId: 'te-deteinato' }, { foodId: 'tisana' }],
}

const bevandaRisoOCocco: SuggestionItem = {
  choices: [{ foodId: 'bevanda-di-riso' }, { foodId: 'bevanda-di-cocco' }],
}
const chia: SuggestionItem = { choices: [{ foodId: 'semi-di-chia', quantity: 15, unit: 'g' }] }
const gallette: SuggestionChoice = { foodId: 'gallette-di-riso-o-mais', quantity: 4, unit: 'pezzi' }
const biscotti: SuggestionChoice = { foodId: 'biscotti-senza-glutine', quantity: 80, unit: 'g' }
const galletteOBiscotti: SuggestionItem = { choices: [gallette, biscotti] }
const mirtilli: SuggestionItem = { choices: [{ foodId: 'mirtilli', quantity: 125, unit: 'g' }] }
const IMPASTO = 'Impasto dei pancake'

export const SUGGESTIONS: Suggestion[] = [
  // --- Spuntini ------------------------------------------------------------
  {
    id: 'spuntino-frutta',
    kind: 'spuntino',
    title: 'Frutta',
    description: '1 frutto, nella porzione indicata in tabella.',
    items: [{ choices: [], fromTag: 'frutto' }],
  },
  {
    id: 'spuntino-yogurt',
    kind: 'spuntino',
    title: 'Yogurt delattosato',
    description: 'Anche greco. Conta per i latticini delattosati della settimana.',
    items: [
      {
        choices: [
          { foodId: 'yogurt-delattosato', quantity: 125, unit: 'g' },
          { foodId: 'yogurt-greco-delattosato', quantity: 150, unit: 'g' },
        ],
      },
    ],
  },
  {
    id: 'spuntino-tisana-biscotti',
    kind: 'spuntino',
    title: 'Tisana o tè deteinato + 2 biscotti senza glutine',
    items: [
      { choices: [{ foodId: 'tisana' }, { foodId: 'te-deteinato' }] },
      { choices: [{ foodId: 'biscotti-senza-glutine', quantity: 2, unit: 'pezzi' }] },
    ],
  },
  {
    id: 'spuntino-pinzimonio',
    kind: 'spuntino',
    title: 'Pinzimonio di carote',
    items: [{ choices: [{ foodId: 'pinzimonio-di-carote' }] }],
  },
  {
    id: 'spuntino-popcorn',
    kind: 'spuntino',
    title: 'Pop corn',
    items: [{ choices: [{ foodId: 'pop-corn' }] }],
  },

  // --- Colazione -----------------------------------------------------------
  {
    id: 'colazione-a-bevanda-e-biscotti',
    kind: 'colazione',
    group: 'Veloce',
    title: 'A. Bevanda e biscotti',
    ingredients: [
      '1 bicchiere di bevanda di riso o di cocco longlife',
      '80 g di biscotti senza glutine oppure 4–5 gallette di riso non integrali',
      '2 cucchiaini di crema a scelta: semi di zucca (15 g), tahina (max 11 g) o mandorle 100% (15 g)',
    ],
    eggs: 0,
    flags: [
      {
        level: 'info',
        text: 'Tahina: max 11 g (porzione del sesamo) finché la nutrizionista non conferma i 15 g.',
      },
    ],
    items: [
      bevandaRisoOCocco,
      { choices: [biscotti, gallette] },
      {
        choices: [
          { foodId: 'crema-di-semi-di-zucca', quantity: 15, unit: 'g' },
          { foodId: 'tahina', quantity: 11, unit: 'g' },
          { foodId: 'burro-di-mandorle-100', quantity: 15, unit: 'g' },
        ],
      },
      teOTisana,
    ],
  },
  {
    id: 'colazione-b1-chia-e-frutta',
    kind: 'colazione',
    group: 'Overnight',
    title: 'B1. Chia e frutta',
    ingredients: [
      '15 g di semi di chia in 1 bicchiere di bevanda di riso o di cocco',
      'Al mattino: 125 g di mirtilli e 4–5 gallette sbriciolate',
    ],
    eggs: 0,
    items: [chia, bevandaRisoOCocco, mirtilli, { choices: [gallette] }, teOTisana],
  },
  {
    id: 'colazione-b2-chia-al-cacao',
    kind: 'colazione',
    group: 'Overnight',
    title: 'B2. Chia al cacao',
    ingredients: [
      '15 g di semi di chia in bevanda di cocco',
      '8 g di cacao amaro',
      "1 cucchiaino di sciroppo d'acero",
      'Al mattino: 4–5 gallette sbriciolate oppure 80 g di biscotti senza glutine',
    ],
    eggs: 0,
    items: [
      chia,
      { choices: [{ foodId: 'bevanda-di-cocco' }] },
      { choices: [{ foodId: 'cacao-amaro', quantity: 8, unit: 'g' }] },
      { choices: [{ foodId: 'sciroppo-d-acero', quantity: 1, unit: 'cucchiaini' }] },
      galletteOBiscotti,
      teOTisana,
    ],
  },
  {
    id: 'colazione-b3-chia-tropicale',
    kind: 'colazione',
    group: 'Overnight',
    title: 'B3. Chia tropicale',
    ingredients: [
      'Base B1: 15 g di semi di chia in 1 bicchiere di bevanda di riso o di cocco',
      'Al mattino: 140 g di ananas e 46 g di frutto della passione',
      '4–5 gallette sbriciolate oppure 80 g di biscotti senza glutine',
    ],
    eggs: 0,
    items: [
      chia,
      bevandaRisoOCocco,
      { choices: [{ foodId: 'ananas', quantity: 140, unit: 'g' }] },
      { choices: [{ foodId: 'frutto-della-passione', quantity: 46, unit: 'g' }] },
      galletteOBiscotti,
      teOTisana,
    ],
  },
  {
    id: 'colazione-b4-fiocchi-di-quinoa',
    kind: 'colazione',
    group: 'Overnight',
    title: 'B4. Fiocchi di quinoa overnight',
    ingredients: [
      'Circa 70 g di fiocchi di quinoa (equivalenza per i carboidrati con 100 g di pane)',
      '15 g di semi di chia in 1 bicchiere di bevanda di riso o di cocco',
      'Al mattino: 125 g di mirtilli',
    ],
    eggs: 0,
    flags: [{ level: 'info', text: 'Dose dei fiocchi di quinoa da verificare con la nutrizionista.' }],
    items: [
      { choices: [{ foodId: 'fiocchi-di-quinoa', quantity: 70, unit: 'g' }] },
      chia,
      bevandaRisoOCocco,
      mirtilli,
      teOTisana,
    ],
  },
  {
    id: 'colazione-c-pancake',
    kind: 'colazione',
    group: 'Con cottura',
    title: 'C. Pancake',
    description: "Variante 2 del piano, 3 pancake. Senza zucchero né lievito nell'impasto.",
    ingredients: [
      '62 g di farina di riso o di quinoa',
      '100 g di bevanda di riso o di cocco',
      '1 uovo',
      '12 g di margarina (senza latte né olio di arachide)',
      "Sopra: sciroppo d'acero 100%",
    ],
    eggs: 1,
    flags: [
      { level: 'warning', text: 'Margarina: controlla in etichetta che non ci siano latte né olio di arachide.' },
    ],
    hint: "L'impasto si conserva in frigo, coperto, fino al mattino: mescolalo prima di cuocere.",
    items: [
      {
        note: IMPASTO,
        choices: [
          { foodId: 'farina-di-riso', quantity: 62, unit: 'g' },
          { foodId: 'farina-di-quinoa', quantity: 62, unit: 'g' },
        ],
      },
      {
        note: IMPASTO,
        choices: [
          { foodId: 'bevanda-di-riso', quantity: 100, unit: 'g' },
          { foodId: 'bevanda-di-cocco', quantity: 100, unit: 'g' },
        ],
      },
      { note: IMPASTO, choices: [{ foodId: 'uova', quantity: 1, unit: 'pezzi' }] },
      { note: IMPASTO, choices: [{ foodId: 'margarina', quantity: 12, unit: 'g' }] },
      { note: 'Sui pancake', choices: [{ foodId: 'sciroppo-d-acero' }] },
      teOTisana,
    ],
  },
  {
    id: 'colazione-d-uova-e-pane',
    kind: 'colazione',
    group: 'Salata',
    title: 'D. Uova e pane',
    ingredients: [
      '2 uova strapazzate',
      '100 g di pane senza glutine',
      '75 g di spinaci',
      '1 cucchiaino di olio EVO',
    ],
    eggs: 2,
    items: [
      { note: 'Strapazzate', choices: [{ foodId: 'uova', quantity: 2, unit: 'pezzi' }] },
      { choices: [{ foodId: 'pane-senza-glutine', quantity: 100, unit: 'g' }] },
      { choices: [{ foodId: 'spinaci', quantity: 75, unit: 'g' }] },
      { choices: [{ foodId: 'olio-evo', quantity: 1, unit: 'cucchiaini' }] },
      teOTisana,
    ],
  },
  {
    id: 'colazione-e-uova-sode-e-gallette',
    kind: 'colazione',
    group: 'Salata',
    title: 'E. Uova sode e gallette',
    ingredients: ['2 uova sode', '4–5 gallette di riso non integrali', '75 g di cetrioli'],
    eggs: 2,
    items: [
      { note: 'Sode', choices: [{ foodId: 'uova', quantity: 2, unit: 'pezzi' }] },
      { choices: [gallette] },
      { choices: [{ foodId: 'cetrioli', quantity: 75, unit: 'g' }] },
      teOTisana,
    ],
  },

  // --- Pranzo e cena ------------------------------------------------------
  ...(
    [
      ['Piatti unici', 'panino-con-hamburger-e-insalata-o-cicoria'],
      ['Piatti unici', 'panino-con-tonno-e-pomodori-o-spinaci'],
      ['Piatti unici', 'panino-con-melanzane-e-alici-marinate'],
      ['Piatti unici', 'pasta-con-zucchine-e-gamberetti'],
      ['Piatti unici', 'insalata-di-patate-con-tonno-pomodori-carote-e-maionese'],
      ['Primo + secondo', 'pasta-al-ragu-di-carne'],
      ['Primo + secondo', 'pasta-alle-vongole'],
      ['Primo + secondo', 'polenta-al-ragu'],
      ['Primo + secondo', 'pesce-al-forno-con-patate'],
      ['Primo + contorno', 'pasta-con-crema-di-zucca-e-granella-di-pistacchi'],
      ['Primo + contorno', 'verdure-grigliate-con-crostini'],
      ['Primo + contorno', 'quinoa-con-verdure'],
      ['Primo + contorno', 'vellutata-di-zucca-carote-e-patate'],
    ] as const
  ).map(
    ([group, foodId]): Suggestion => ({
      id: `pasto-${foodId}`,
      kind: 'pasto',
      group,
      title: SEED_FOODS.find((f) => f.id === foodId)?.name ?? foodId,
      items: [{ choices: [{ foodId, quantity: 1, unit: 'porzioni' }] }],
      hint:
        group === 'Primo + secondo'
          ? 'Completa con un contorno.'
          : group === 'Primo + contorno'
            ? 'Completa con un secondo.'
            : undefined,
    }),
  ),
]
