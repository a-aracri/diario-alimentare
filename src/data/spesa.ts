/**
 * Lista della spesa precaricata: gli alimenti consentiti dal piano (permessi e
 * con limite), gli ingredienti delle ricette e gli integratori, divisi per
 * reparto. Le voci prese dal database alimenti hanno lo stesso id
 * dell'alimento.
 *
 * Gli id sono stabili: non cambiarli. Se modifichi questo file incrementa
 * SEED_VERSION in src/repo/seed.ts.
 */
import type { ShoppingItem, ShoppingSection } from '@/model/types'
import { SEED_FOODS, slugify } from './fodmap'
import { DEFAULT_SUPPLEMENTS } from './piano'

export type SeedShoppingItem = Omit<ShoppingItem, 'status' | 'custom' | 'updatedAt'>

/** Indicazioni del piano utili quando si compra, mostrate sotto il reparto. */
export const SHOPPING_HINTS: Partial<Record<ShoppingSection, string>> = {
  'carne-pesce': 'Carne e pesce non trasformati: niente salsicce.',
  frigo: 'Latte, yogurt e formaggi solo delattosati. Niente latte o yogurt di soia da soia intera.',
  'pane-pasta': 'Senza glutine, con farine consentite (riso, mais, quinoa…). Evita gli integrali.',
  dispensa: 'Niente brodo pronto, dado e salse pronte.',
}

const POLIOLI = 'In etichetta: niente polioli (sorbitolo, mannitolo…).'

const FOOD_NAME = new Map(SEED_FOODS.map((f) => [f.id, f.name]))

/** Voce presa dal database alimenti: stesso id e, se non indicato, stesso nome. */
function food(section: ShoppingSection, foodId: string, opts: { name?: string; note?: string } = {}): SeedShoppingItem {
  const name = FOOD_NAME.get(foodId)
  if (!name) throw new Error(`Lista della spesa: alimento «${foodId}» non trovato`)
  return { id: foodId, name: opts.name ?? name, section, ...(opts.note && { note: opts.note }) }
}

function foods(section: ShoppingSection, ids: string[]): SeedShoppingItem[] {
  return ids.map((id) => food(section, id))
}

/** Voce che non è nel database alimenti, es. un ingrediente delle ricette. */
function other(section: ShoppingSection, name: string, note?: string): SeedShoppingItem {
  return { id: slugify(name), name, section, ...(note && { note }) }
}

export const SEED_SHOPPING: SeedShoppingItem[] = [
  ...foods('verdura', [
    'patate',
    'carote',
    'zucchine',
    'melanzane',
    'zucca-non-trombetta',
    'pomodori-da-insalata',
    'pomodori-ciliegini',
    'pomodori-san-marzano',
    'lattuga',
    'rucola',
    'cappuccina',
    'spinaci',
    'bietole',
    'cicoria',
    'indivia-belga',
    'cetrioli',
    'finocchi',
    'fagiolini',
    'ravanelli',
    'broccoli-solo-teste',
    'broccoletti',
    'cavoletti-di-bruxelles',
    'cavolo-cinese',
    'cavolo-kale',
    'cavolo-nero',
    'cavolo-rosso',
    'verza',
    'germogli-di-soia',
    'germogli-di-alfa-alfa',
    'germogli-di-bambu',
  ]),

  ...foods('frutta', [
    'arancia',
    'clementine',
    'mandarino',
    'limone',
    'lime',
    'pompelmo',
    'ananas',
    'fragole',
    'lamponi',
    'mirtilli',
    'kiwi',
    'litchi',
    'frutto-della-passione',
    'melone',
    'melone-bianco',
    'papaya',
    'pitaya',
    'rabarbaro',
    'uva',
    'ciliegie',
    'more',
  ]),
  food('frutta', 'banana', { note: 'Gialla tendente al verde.' }),

  ...foods('carne-pesce', [
    'manzo',
    'vitello',
    'maiale',
    'pollo',
    'tacchino',
    'agnello',
    'coniglio',
    'merluzzo',
    'orata',
    'branzino',
    'salmone',
    'tonno',
    'alici',
    'gamberetti',
    'vongole',
    'cozze',
    'calamari',
    'polpo',
  ]),
  other('carne-pesce', 'Carne macinata', 'Per hamburger e ragù fatti in casa.'),
  food('carne-pesce', 'uova', { note: 'Max 8 a settimana.' }),

  ...foods('frigo', [
    'yogurt-delattosato',
    'yogurt-greco-delattosato',
    'latte-delattosato',
    'mozzarella-delattosata',
    'formaggio-delattosato',
    'bevanda-di-riso',
    'bevanda-di-mandorla',
    'bevanda-di-macadamia',
    'bevanda-di-cocco',
  ]),

  ...foods('pane-pasta', [
    'pasta-senza-glutine',
    'riso',
    'riso-selvatico',
    'quinoa',
    'miglio',
    'grano-saraceno',
    'polenta',
    'sorgo',
    'teff',
    'tapioca',
    'gallette-di-riso-o-mais',
    'pop-corn',
  ]),
  food('pane-pasta', 'pane-senza-glutine', { note: POLIOLI }),
  food('pane-pasta', 'crackers-senza-glutine', { note: POLIOLI }),
  food('pane-pasta', 'fiocchi-di-quinoa', { note: 'Per la colazione overnight.' }),

  ...foods('farine', ['farina-di-riso', 'farina-di-mais', 'fecola-di-patate']),
  other('farine', 'Farina di mandorle', 'Per la torta di mandorle.'),
  food('farine', 'farina-di-quinoa', { note: 'Per i pancake.' }),
  other('farine', 'Lievito per dolci', 'Per la torta di mandorle.'),

  food('colazione', 'biscotti-senza-glutine', { note: POLIOLI }),
  food('colazione', 'sciroppo-d-acero', { note: '100%.' }),
  ...foods('colazione', [
    'marmellata',
    'sciroppo-di-riso',
    'zucchero',
    'zucchero-di-canna-integrale',
    'cacao-amaro',
    'cioccolato-fondente-85',
  ]),

  ...foods('frutta-secca', [
    'mandorle',
    'nocciole',
    'noci',
    'noci-del-brasile',
    'noci-macadamia',
    'noci-pecan',
    'pinoli',
    'semi-di-chia',
    'semi-di-girasole',
    'semi-di-lino',
    'semi-di-sesamo',
    'semi-di-zucca',
    'burro-di-semi-o-noci',
    'burro-di-mandorle-100',
    'crema-di-semi-di-zucca',
    'tahina',
    'spirulina-in-polvere',
    'uvetta-sultanina',
  ]),

  ...foods('dispensa', [
    'olio-evo',
    'olio-di-cocco',
    'aceto',
    'sale',
    'maionese',
    'ketchup',
    'senape',
    'olive-verdi',
    'olive-nere',
    'concentrato-di-pomodoro-100',
    'pomodori-secchi',
  ]),
  food('dispensa', 'altri-oli-vegetali', { name: 'Olio di semi' }),
  food('dispensa', 'salsa-di-soia', { note: 'Meglio senza glutine.' }),
  food('dispensa', 'margarina', { note: 'Senza latte né olio di arachide.' }),
  other('dispensa', 'Tonno in scatola'),

  ...foods('erbe-spezie', [
    'basilico',
    'prezzemolo',
    'rosmarino',
    'salvia',
    'origano',
    'timo',
    'erba-cipollina',
    'menta',
    'zenzero',
    'cannella',
    'pepe',
    'curcuma',
    'paprika',
    'vaniglia',
  ]),

  ...foods('bevande', [
    'acqua',
    'te-deteinato',
    'te-verde',
    'tisana-alla-menta',
    'acqua-di-cocco',
    'succo-di-mirtillo',
    'limonata',
  ]),
  food('bevande', 'te-nero', { note: 'No chai e oolong.' }),
  food('bevande', 'tisana', { name: 'Tisane', note: 'No camomilla, finocchio, tarassaco.' }),

  ...DEFAULT_SUPPLEMENTS.map(
    (s): SeedShoppingItem => ({ id: `integratore-${s.id}`, name: s.name, section: 'integratori' }),
  ),
]
