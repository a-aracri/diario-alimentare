/**
 * Indicazioni del piano: limiti, suggerimenti (spuntini, colazioni, idee per
 * pranzo e cena), consigli per la fase acuta, integratori e gruppi FODMAP
 * per la reintroduzione. Gli alimenti sono in ./fodmap.ts.
 */
import type { FoodTag, Limits, MealId, Supplement, Unit } from '@/model/types'
import { SEED_FOODS } from './fodmap'

export const DEFAULT_LIMITS: Limits = {
  oilTbspPerDay: 4,
  eggsPerWeek: 6,
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

export const DEFAULT_SUPPLEMENTS: Omit<Supplement, 'startDate' | 'updatedAt'>[] = [
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
    timing: 'Al mattino',
    mode: 'giornaliero',
    durationDays: 30,
    afterDuration: 'stop',
    reminderTime: '10:00',
    note: 'Per 1 mese.',
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
}

export interface Recipe {
  servings?: string
  ingredients: string[]
  steps: string[]
}

export type SuggestionKind = 'colazione' | 'spuntino' | 'pasto'

export interface Suggestion {
  id: string
  kind: SuggestionKind
  group?: string
  title: string
  description?: string
  items: SuggestionItem[]
  recipe?: Recipe
  hint?: string
}

export const SUGGESTION_MEALS: Record<SuggestionKind, MealId[]> = {
  colazione: ['colazione'],
  spuntino: ['spuntino-mattina', 'spuntino-pomeriggio'],
  pasto: ['pranzo', 'cena'],
}

export const PLAN_NOTES: Record<SuggestionKind, string> = {
  colazione: 'Carboidrati + proteine/grassi. Scegli una delle 5 varianti.',
  spuntino: 'Mattina e pomeriggio, uno a scelta.',
  pasto: 'Pranzo e cena: primo + secondo + contorno.',
}

const teOTisana: SuggestionItem = {
  choices: [{ foodId: 'te-deteinato' }, { foodId: 'tisana' }],
}

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
    description: 'Conta per i latticini delattosati della settimana.',
    items: [{ choices: [{ foodId: 'yogurt-delattosato', quantity: 125, unit: 'g' }] }],
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
    id: 'colazione-1',
    kind: 'colazione',
    title: 'Bevanda vegetale + biscotti o gallette',
    description:
      'Bevanda vegetale (riso, macadamia, mandorla, cocco) + 6 biscotti con cereali consentiti oppure 4 gallette con un velo di marmellata o 2 cucchiaini di burro di mandorle 100%.',
    items: [
      {
        choices: [
          { foodId: 'bevanda-di-riso' },
          { foodId: 'bevanda-di-macadamia' },
          { foodId: 'bevanda-di-mandorla' },
          { foodId: 'bevanda-di-cocco' },
        ],
      },
      {
        choices: [
          { foodId: 'biscotti-senza-glutine', quantity: 6, unit: 'pezzi' },
          { foodId: 'gallette-di-riso-o-mais', quantity: 4, unit: 'pezzi' },
        ],
      },
      {
        optional: true,
        choices: [
          { foodId: 'marmellata' },
          { foodId: 'burro-di-mandorle-100', quantity: 2, unit: 'cucchiaini' },
        ],
      },
    ],
  },
  {
    id: 'colazione-2',
    kind: 'colazione',
    title: 'Tè verde o tisana + 3 pancake',
    description:
      "Tè verde o tisana senza zucchero + 3 pancake con farine permesse (riso, mandorle, quinoa), senza zucchero né lievito nell'impasto, con sciroppo d'acero 100%.",
    items: [
      { choices: [{ foodId: 'te-verde' }, { foodId: 'tisana' }] },
      { choices: [{ foodId: 'pancake-con-farine-permesse', quantity: 3, unit: 'pezzi' }] },
      { choices: [{ foodId: 'sciroppo-d-acero', quantity: 1, unit: 'cucchiai' }] },
    ],
  },
  {
    id: 'colazione-3',
    kind: 'colazione',
    title: 'Tè deteinato o tisana + porridge di quinoa',
    items: [teOTisana, { choices: [{ foodId: 'porridge-di-quinoa', quantity: 1, unit: 'porzioni' }] }],
    recipe: {
      servings: '1 porzione',
      ingredients: [
        '40 g di quinoa sciacquata',
        "120 ml d'acqua",
        'Cannella in stecca',
        'Un pizzico di sale',
        '2 cucchiaini di noci',
        '½ cucchiaio di uvetta',
        "1 cucchiaio di sciroppo d'acero",
        '4 cucchiai di latte di mandorla o di riso',
      ],
      steps: [
        'Cuoci quinoa, acqua, cannella e sale per 15 minuti a fuoco lento, coperto.',
        'Lascia riposare 5 minuti.',
        "Guarnisci con noci, uvetta, sciroppo d'acero e latte di mandorla o di riso.",
      ],
    },
  },
  {
    id: 'colazione-4',
    kind: 'colazione',
    title: 'Tè deteinato o tisana + pudding di riso',
    items: [teOTisana, { choices: [{ foodId: 'pudding-di-riso', quantity: 1, unit: 'porzioni' }] }],
    recipe: {
      servings: '4 porzioni',
      ingredients: [
        '700 ml di latte di mandorla o di riso',
        '70 g di zucchero',
        '60 g di riso arborio',
        '1 cucchiaino di vaniglia',
        '¼ di cucchiaino di cannella',
        '2 cucchiai di uvetta',
        'Facoltativo: 3 cucchiai di mandorle a lamelle',
      ],
      steps: [
        'Porta a bollore il latte con lo zucchero.',
        "Aggiungi il riso e cuoci coperto per 1 ora, mescolando.",
        'Unisci vaniglia, cannella e uvetta.',
        'Lascia raffreddare 1 ora; se vuoi, aggiungi le mandorle a lamelle.',
      ],
    },
  },
  {
    id: 'colazione-5',
    kind: 'colazione',
    title: 'Tè deteinato o tisana + 1 fetta di torta di mandorle',
    items: [teOTisana, { choices: [{ foodId: 'torta-di-mandorle', quantity: 1, unit: 'fette' }] }],
    recipe: {
      ingredients: [
        '2 uova',
        '200 g di fecola di patate',
        '150 g di zucchero',
        '100 g di farina di mandorle',
        '½ bustina di lievito',
        '½ bicchiere di olio EVO',
      ],
      steps: ['Mescola tutti gli ingredienti.', 'Cuoci in forno a 180 °C per 30 minuti.'],
    },
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
