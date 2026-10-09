/**
 * Database alimenti precaricato, dal piano Low FODMAP.
 *
 * Stati:
 * - permesso: consentito (l'eventuale porzione è quella standard del piano)
 * - limite: consentito fino alla porzione indicata o con moderazione
 * - evitare: nella lista degli alimenti da evitare
 * - verificare: compare in liste diverse o in nessuna lista
 *
 * Gli id sono slug stabili: non cambiarli, servono per aggiornare il seed
 * senza duplicare gli alimenti già salvati sul dispositivo.
 * Se modifichi questo file incrementa SEED_VERSION in src/repo/seed.ts.
 */
import type { FoodCategory, FoodStatus, FoodTag, Portion, Unit } from '@/model/types'

export interface SeedFood {
  id: string
  name: string
  category: FoodCategory
  status: FoodStatus
  maxPortion?: Portion
  note?: string
  tags?: FoodTag[]
  aliases?: string[]
}

interface Opts {
  max?: [number, Unit]
  note?: string
  tags?: FoodTag[]
  aliases?: string[]
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/%/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function make(status: FoodStatus) {
  return (name: string, category: FoodCategory, opts: Opts = {}): SeedFood => ({
    id: slugify(name),
    name,
    category,
    status,
    ...(opts.max && { maxPortion: { amount: opts.max[0], unit: opts.max[1] } }),
    ...(opts.note && { note: opts.note }),
    ...(opts.tags && { tags: opts.tags }),
    ...(opts.aliases && { aliases: opts.aliases }),
  })
}

const ok = make('permesso')
const lim = make('limite')
const no = make('evitare')
const check = make('verificare')

const CEREALI = 'Porzione 100 g. Evitare gli integrali.'
const CARNE = 'Non trasformata, porzione 150 g.'
const PESCE = 'Non trasformato, porzione 200 g.'
const NOCI = 'Porzione indicata dal piano.'
const FRUTTO = '1 frutto.'
const DELATTOSATI = '150 g, una volta a settimana.'
const ACUTA = 'Sconsigliato in fase acuta di gastrite/reflusso.'

export const SEED_FOODS: SeedFood[] = [
  // --- Cereali e carboidrati: permessi -----------------------------------
  ok('Grano saraceno', 'cereali', { max: [100, 'g'], note: CEREALI }),
  ok('Farina di mais', 'cereali', { max: [100, 'g'], note: CEREALI }),
  ok('Polenta', 'cereali', { max: [100, 'g'], note: CEREALI }),
  ok('Miglio', 'cereali', { max: [100, 'g'], note: CEREALI }),
  ok('Quinoa', 'cereali', { max: [100, 'g'], note: CEREALI }),
  ok('Riso', 'cereali', {
    max: [100, 'g'],
    note: CEREALI,
    aliases: ['riso basmati', 'riso arborio', 'riso carnaroli', 'risotto'],
  }),
  ok('Riso selvatico', 'cereali', { max: [100, 'g'], note: CEREALI }),
  ok('Sorgo', 'cereali', { max: [100, 'g'], note: CEREALI }),
  ok('Tapioca', 'cereali', { max: [100, 'g'], note: CEREALI }),
  ok('Teff', 'cereali', { max: [100, 'g'], note: CEREALI }),
  ok('Patate', 'cereali', { max: [100, 'g'], note: CEREALI, aliases: ['patata'] }),
  ok('Pasta senza glutine', 'cereali', {
    max: [100, 'g'],
    note: 'Con farine consentite (riso, mais, quinoa…). Porzione 100 g.',
    aliases: ['pasta di riso', 'pasta di mais', 'pasta di quinoa', 'spaghetti', 'penne'],
  }),
  ok('Pane senza glutine', 'cereali', {
    max: [100, 'g'],
    note: 'Con farine consentite. Porzione 100 g.',
    aliases: ['panino', 'crostini'],
  }),
  ok('Crackers senza glutine', 'cereali', {
    max: [100, 'g'],
    note: 'Con farine consentite. Porzione 100 g.',
  }),
  ok('Gallette di riso o mais', 'cereali', { aliases: ['gallette'] }),
  ok('Biscotti senza glutine', 'cereali', {
    note: 'Con cereali consentiti: 2 nello spuntino, 6 a colazione.',
    aliases: ['biscotti'],
  }),
  ok('Farina di riso', 'cereali', { max: [100, 'g'] }),
  ok('Fecola di patate', 'cereali'),
  ok('Pop corn', 'cereali', { note: 'Indicati tra gli spuntini.', aliases: ['popcorn'] }),

  // --- Cereali: da evitare -----------------------------------------------
  no('Cereali da colazione con grano, orzo o segale', 'cereali', {
    aliases: ['corn flakes', 'muesli'],
  }),
  no('Orzo', 'cereali'),
  no('Pane di grano', 'cereali', { aliases: ['pane comune', 'pane bianco'] }),
  no('Pasta di grano', 'cereali', { aliases: ['pasta di semola', 'pasta normale'] }),
  no('Biscotti di grano', 'cereali'),
  no('Cous cous', 'cereali', { aliases: ['couscous'] }),
  no('Farina di grano', 'cereali', { aliases: ['farina 00', 'farina di frumento'] }),
  no('Kamut', 'cereali'),
  no('Prodotti di segale', 'cereali', { aliases: ['segale'] }),
  no('Prodotti integrali', 'cereali', { aliases: ['integrale', 'integrali'] }),

  // --- Carne, pesce e uova -----------------------------------------------
  ok('Manzo', 'proteine', { max: [150, 'g'], note: CARNE, aliases: ['carne bovina', 'bistecca'] }),
  ok('Vitello', 'proteine', { max: [150, 'g'], note: CARNE }),
  ok('Maiale', 'proteine', { max: [150, 'g'], note: CARNE }),
  ok('Pollo', 'proteine', { max: [150, 'g'], note: CARNE }),
  ok('Tacchino', 'proteine', { max: [150, 'g'], note: CARNE }),
  ok('Agnello', 'proteine', { max: [150, 'g'], note: CARNE }),
  ok('Coniglio', 'proteine', { max: [150, 'g'], note: CARNE }),
  ok('Hamburger fatto in casa', 'proteine', { max: [150, 'g'], note: CARNE }),
  ok('Pesce', 'proteine', { max: [200, 'g'], note: PESCE }),
  ok('Merluzzo', 'proteine', { max: [200, 'g'], note: PESCE }),
  ok('Orata', 'proteine', { max: [200, 'g'], note: PESCE }),
  ok('Branzino', 'proteine', { max: [200, 'g'], note: PESCE, aliases: ['spigola'] }),
  ok('Salmone', 'proteine', { max: [200, 'g'], note: PESCE }),
  ok('Tonno', 'proteine', { max: [200, 'g'], note: PESCE, aliases: ['tonno in scatola'] }),
  ok('Alici', 'proteine', { max: [200, 'g'], note: PESCE, aliases: ['acciughe'] }),
  ok('Gamberetti', 'proteine', { max: [200, 'g'], note: PESCE, aliases: ['gamberi'] }),
  ok('Vongole', 'proteine', { max: [200, 'g'], note: PESCE }),
  ok('Cozze', 'proteine', { max: [200, 'g'], note: PESCE }),
  ok('Calamari', 'proteine', { max: [200, 'g'], note: PESCE }),
  ok('Polpo', 'proteine', { max: [200, 'g'], note: PESCE }),
  lim('Uova', 'proteine', { note: 'Max 6 a settimana.', tags: ['uovo'], aliases: ['uovo', 'frittata'] }),
  no('Salsicce', 'proteine'),

  // --- Latte e latticini -------------------------------------------------
  lim('Yogurt delattosato', 'latticini', { note: DELATTOSATI, tags: ['latticino-delattosato'] }),
  lim('Latte delattosato', 'latticini', { note: DELATTOSATI, tags: ['latticino-delattosato'] }),
  lim('Mozzarella delattosata', 'latticini', { note: DELATTOSATI, tags: ['latticino-delattosato'] }),
  lim('Formaggio delattosato', 'latticini', { note: DELATTOSATI, tags: ['latticino-delattosato'] }),
  no('Latte vaccino', 'latticini', { aliases: ['latte', 'latte di mucca'] }),
  no('Latte di capra', 'latticini'),
  no('Latte di pecora', 'latticini'),
  no('Latte in polvere', 'latticini'),
  no('Latte condensato', 'latticini'),
  no('Fiocchi di latte', 'latticini'),
  no('Formaggi cremosi aromatizzati', 'latticini', { aliases: ['formaggio spalmabile'] }),
  no('Mascarpone', 'latticini'),
  no('Quark', 'latticini'),
  no('Ricotta', 'latticini'),
  no('Gelato', 'latticini'),
  no('Kefir', 'latticini'),
  no('Latte di soia (da soia intera)', 'latticini', { aliases: ['bevanda di soia'] }),
  no('Yogurt di soia (da soia intera)', 'latticini'),

  // --- Legumi --------------------------------------------------------------
  no('Ceci', 'legumi'),
  no('Edamame', 'legumi'),
  no('Fagioli', 'legumi'),
  no('Fave', 'legumi'),
  no('Lenticchie', 'legumi'),
  no('Piselli secchi', 'legumi'),

  // --- Noci e semi (2 cucchiai se non indicato) ----------------------------
  lim('Burro di semi o noci', 'noci-semi', { max: [2, 'cucchiai'], note: NOCI }),
  lim('Burro di mandorle 100%', 'noci-semi', { max: [2, 'cucchiai'], note: NOCI }),
  lim('Mandorle', 'noci-semi', { max: [12, 'g'], note: NOCI, aliases: ['farina di mandorle'] }),
  lim('Nocciole', 'noci-semi', { max: [12, 'g'], note: NOCI }),
  lim('Noci', 'noci-semi', { max: [30, 'g'], note: NOCI }),
  lim('Noci del Brasile', 'noci-semi', { max: [2, 'cucchiai'], note: NOCI }),
  lim('Noci macadamia', 'noci-semi', { max: [2, 'cucchiai'], note: NOCI }),
  lim('Noci pecan', 'noci-semi', { max: [2, 'cucchiai'], note: NOCI }),
  lim('Pinoli', 'noci-semi', { max: [2, 'cucchiai'], note: NOCI }),
  lim('Semi di chia', 'noci-semi', { max: [2, 'cucchiai'], note: NOCI }),
  lim('Semi di girasole', 'noci-semi', { max: [24, 'g'], note: NOCI }),
  lim('Semi di lino', 'noci-semi', { max: [2, 'cucchiai'], note: NOCI }),
  lim('Semi di sesamo', 'noci-semi', { max: [11, 'g'], note: NOCI }),
  lim('Semi di zucca', 'noci-semi', { max: [2, 'cucchiai'], note: NOCI }),
  lim('Spirulina in polvere', 'noci-semi', { max: [8, 'g'], note: NOCI }),
  no('Anacardi', 'noci-semi'),
  check('Pistacchi', 'noci-semi', {
    note: 'Compaiono sia nelle idee del piano sia tra gli alimenti da evitare.',
  }),

  // --- Verdure -------------------------------------------------------------
  ok('Bietole', 'verdure'),
  lim('Broccoli (solo teste)', 'verdure', { max: [75, 'g'], aliases: ['broccoli'] }),
  ok('Carote', 'verdure', { aliases: ['carota'] }),
  lim('Cavoletti di Bruxelles', 'verdure', { max: [38, 'g'] }),
  lim('Cavolo cinese', 'verdure', { max: [40, 'g'] }),
  ok('Cavolo kale', 'verdure', { aliases: ['cavolo nero'] }),
  lim('Verza', 'verdure', { max: [40, 'g'] }),
  lim('Cavolo rosso', 'verdure', { max: [75, 'g'] }),
  lim('Cetrioli', 'verdure', { max: [75, 'g'], aliases: ['cetriolo'] }),
  lim('Cicoria', 'verdure', { max: [75, 'g'] }),
  lim('Fagiolini', 'verdure', { max: [75, 'g'] }),
  lim('Finocchi', 'verdure', { max: [48, 'g'], aliases: ['finocchio'] }),
  ok('Indivia belga', 'verdure'),
  lim('Lattuga', 'verdure', { max: [75, 'g'], note: 'Tutte le varietà.', aliases: ['insalata'] }),
  lim('Cappuccina', 'verdure', { max: [75, 'g'] }),
  lim('Ravanelli', 'verdure', { max: [75, 'g'] }),
  lim('Spinaci', 'verdure', { max: [75, 'g'] }),
  lim('Zenzero', 'verdure', { max: [5, 'g'] }),
  lim('Zucca (non trombetta)', 'verdure', { max: [75, 'g'], aliases: ['zucca'] }),
  lim('Zucchine', 'verdure', { max: [65, 'g'], aliases: ['zucchina'] }),
  lim('Olive nere', 'verdure', { max: [60, 'g'] }),
  lim('Rucola', 'verdure', { max: [75, 'g'] }),
  lim('Pomodori da insalata', 'verdure', { max: [65, 'g'], aliases: ['pomodoro'] }),
  lim('Pomodori ciliegini', 'verdure', { max: [45, 'g'], aliases: ['pomodorini'] }),
  lim('Pomodori San Marzano', 'verdure', { max: [48, 'g'], aliases: ['pelati', 'passata'] }),
  lim('Concentrato di pomodoro 100%', 'verdure', { max: [22, 'g'] }),
  lim('Pomodori secchi', 'verdure', { max: [13, 'g'] }),
  ok('Germogli di soia', 'verdure'),
  ok('Germogli di alfa alfa', 'verdure'),
  ok('Germogli di bambù', 'verdure'),
  no('Aglio', 'verdure'),
  no('Asparagi', 'verdure'),
  no('Barbabietole rosse', 'verdure', { aliases: ['barbabietola'] }),
  no('Carciofi', 'verdure', { aliases: ['carciofo'] }),
  no('Cavolfiore', 'verdure'),
  no('Cipolle', 'verdure', {
    note: 'Tutte le cipolle.',
    aliases: ['cipolla', 'scalogno', 'cipollotto'],
  }),
  no('Funghi', 'verdure'),
  no('Porri', 'verdure', { aliases: ['porro'] }),
  no('Taccole', 'verdure'),
  no('Topinambur', 'verdure'),
  no('Zucca trombetta', 'verdure'),
  no('Sedano', 'verdure'),
  check('Mais dolce', 'verdure', {
    note: 'Come verdura: il mais compare tra gli alimenti da evitare.',
    aliases: ['mais'],
  }),
  check('Melanzane', 'verdure', {
    note: 'Compaiono nelle idee del piano ma non nella lista dei permessi.',
    aliases: ['melanzana'],
  }),

  // --- Erbe aromatiche e spezie ------------------------------------------
  ok('Erbe aromatiche', 'erbe', { note: 'Tutte.' }),
  ok('Basilico', 'erbe'),
  ok('Prezzemolo', 'erbe'),
  ok('Rosmarino', 'erbe'),
  ok('Salvia', 'erbe'),
  ok('Origano', 'erbe'),
  ok('Timo', 'erbe'),
  ok('Erba cipollina', 'erbe'),
  ok('Menta', 'erbe', { note: ACUTA, tags: ['menta'] }),
  ok('Spezie', 'erbe'),
  ok('Cannella', 'erbe'),
  ok('Pepe', 'erbe'),
  ok('Curcuma', 'erbe'),
  ok('Paprika', 'erbe'),
  ok('Vaniglia', 'erbe'),

  // --- Frutta (1 frutto se non indicato) -----------------------------------
  ok('Arancia', 'frutta', { max: [1, 'pezzi'], note: FRUTTO, tags: ['frutto', 'agrumi'] }),
  ok('Clementine', 'frutta', {
    max: [1, 'pezzi'],
    note: FRUTTO,
    tags: ['frutto', 'agrumi'],
    aliases: ['clementina'],
  }),
  ok('Lime', 'frutta', { max: [1, 'pezzi'], note: FRUTTO, tags: ['frutto', 'agrumi'] }),
  ok('Limone', 'frutta', { max: [1, 'pezzi'], note: FRUTTO, tags: ['frutto', 'agrumi'] }),
  ok('Mandarino', 'frutta', { max: [1, 'pezzi'], note: FRUTTO, tags: ['frutto', 'agrumi'] }),
  lim('Pompelmo', 'frutta', { max: [80, 'g'], tags: ['frutto', 'agrumi'] }),
  lim('Ananas', 'frutta', { max: [140, 'g'], tags: ['frutto'] }),
  lim('Fragole', 'frutta', { max: [65, 'g'], tags: ['frutto'] }),
  lim('Lamponi', 'frutta', { max: [60, 'g'], tags: ['frutto'] }),
  lim('Mirtilli', 'frutta', { max: [125, 'g'], tags: ['frutto'] }),
  lim('Kiwi', 'frutta', { max: [150, 'g'], tags: ['frutto'] }),
  lim('Litchi', 'frutta', { max: [30, 'g'], tags: ['frutto'] }),
  lim('Frutto della passione', 'frutta', { max: [46, 'g'], tags: ['frutto'], aliases: ['maracuja'] }),
  lim('Melone', 'frutta', { max: [120, 'g'], tags: ['frutto'] }),
  lim('Melone bianco', 'frutta', { max: [90, 'g'], tags: ['frutto'] }),
  lim('Papaya', 'frutta', { max: [140, 'g'], tags: ['frutto'] }),
  lim('Pitaya', 'frutta', { max: [330, 'g'], tags: ['frutto'], aliases: ['dragon fruit'] }),
  lim('Rabarbaro', 'frutta', { max: [150, 'g'], tags: ['frutto'] }),
  lim('Uva', 'frutta', { max: [150, 'g'], tags: ['frutto'] }),
  lim('Uvetta sultanina', 'frutta', { max: [7, 'g'], aliases: ['uvetta'] }),
  lim('Banana', 'frutta', {
    max: [100, 'g'],
    note: 'Gialla tendente al verde.',
    tags: ['frutto'],
  }),
  check('Ciliegie', 'frutta', {
    max: [20, 'g'],
    note: 'Compaiono sia tra i permessi sia tra quelli da evitare.',
    tags: ['frutto'],
  }),
  check('More', 'frutta', {
    max: [32, 'g'],
    note: 'Compaiono sia tra i permessi sia tra quelli da evitare.',
    tags: ['frutto'],
  }),
  no('Albicocche', 'frutta', { tags: ['frutto'], aliases: ['albicocca'] }),
  no('Anguria', 'frutta', { tags: ['frutto'], aliases: ['cocomero'] }),
  no('Avocado', 'frutta'),
  no('Cachi', 'frutta', { tags: ['frutto'], aliases: ['caco'] }),
  no('Datteri', 'frutta'),
  no('Fichi', 'frutta', { tags: ['frutto'], aliases: ['fico'] }),
  no('Frutta essiccata', 'frutta', { aliases: ['frutta secca disidratata'] }),
  no('Mango', 'frutta', { tags: ['frutto'] }),
  no('Mele', 'frutta', { tags: ['frutto'], aliases: ['mela'] }),
  no('Nettarine', 'frutta', { tags: ['frutto'], aliases: ['pesca noce'] }),
  no('Pere', 'frutta', { tags: ['frutto'], aliases: ['pera'] }),
  no('Pesche', 'frutta', { tags: ['frutto'], aliases: ['pesca'] }),
  no('Prugne', 'frutta', { tags: ['frutto'], aliases: ['susine'] }),
  no('Prugne secche', 'frutta'),
  no('Tamarillo', 'frutta', { tags: ['frutto'] }),

  // --- Condimenti ----------------------------------------------------------
  ok('Aceto', 'condimenti'),
  lim('Ketchup', 'condimenti', { note: 'Con moderazione.' }),
  ok('Maionese', 'condimenti'),
  ok('Margarina', 'condimenti'),
  lim('Olio EVO', 'condimenti', {
    note: 'Max 4 cucchiai al giorno.',
    tags: ['olio-evo'],
    aliases: ['olio extravergine', "olio d'oliva", 'olio di oliva'],
  }),
  ok('Altri oli vegetali', 'condimenti', { aliases: ['olio di semi'] }),
  ok('Olio di cocco', 'condimenti'),
  ok('Olive verdi', 'condimenti', { aliases: ['olive'] }),
  ok('Salsa di soia', 'condimenti'),
  ok('Senape', 'condimenti'),
  ok('Sale', 'condimenti'),
  no('Brodo pronto', 'condimenti', { note: 'Piatto pronto ad alto FODMAP.', aliases: ['dado'] }),
  no('Salse pronte', 'condimenti', { note: 'Ad alto FODMAP.' }),
  no('Piatti pronti ad alto FODMAP', 'altro'),

  // --- Bevande -------------------------------------------------------------
  ok('Acqua', 'bevande'),
  lim('Acqua di cocco', 'bevande', {
    max: [100, 'ml'],
    note: 'Nel piano è indicato «100 cl»: verifica la quantità con la nutrizionista.',
  }),
  lim('Tè nero', 'bevande', { max: [250, 'g'], note: `No chai e oolong. ${ACUTA}`, tags: ['te'], aliases: ['te'] }),
  lim('Tè verde', 'bevande', { max: [250, 'g'], note: ACUTA, tags: ['te'] }),
  lim('Tè deteinato', 'bevande', { max: [250, 'g'], aliases: ['te deteinato'] }),
  ok('Tisana', 'bevande', {
    note: 'No camomilla, finocchio, tarassaco.',
    aliases: ['infuso', 'rooibos'],
  }),
  ok('Tisana alla menta', 'bevande', { note: ACUTA, tags: ['menta'] }),
  no('Camomilla', 'bevande'),
  no('Tisana al finocchio', 'bevande'),
  no('Tisana al tarassaco', 'bevande'),
  no('Tè chai', 'bevande'),
  no('Tè oolong', 'bevande'),
  lim('Limonata', 'bevande', { max: [150, 'g'], note: ACUTA, tags: ['agrumi'] }),
  lim('Succo di mirtillo', 'bevande', { max: [210, 'g'], note: ACUTA, tags: ['succo-frutta'] }),
  ok('Bevanda di riso', 'bevande', { aliases: ['latte di riso'] }),
  ok('Bevanda di mandorla', 'bevande', { aliases: ['latte di mandorla'] }),
  ok('Bevanda di macadamia', 'bevande', { aliases: ['latte di macadamia'] }),
  ok('Bevanda di cocco', 'bevande', { aliases: ['latte di cocco'] }),
  check('Caffè', 'bevande', {
    note: `Non presente nelle liste del piano. ${ACUTA}`,
    tags: ['caffe'],
    aliases: ['caffe', 'espresso'],
  }),
  check('Caffè decaffeinato', 'bevande', {
    note: 'Non presente nelle liste del piano. In fase acuta è preferibile al caffè normale.',
    aliases: ['decaffeinato', 'deca'],
  }),
  no('Succhi di frutta', 'bevande', { note: ACUTA, tags: ['succo-frutta'], aliases: ['succo'] }),
  no('Surrogati di caffè', 'bevande', {
    note: 'Cicoria, miscele di cereali.',
    aliases: ["caffè d'orzo", 'orzo solubile'],
  }),
  no('Panaché', 'bevande'),
  no('Rum', 'bevande'),
  no('Sidro', 'bevande'),
  no('Vermouth', 'bevande'),
  no('Vini dolci', 'bevande', {
    note: 'Crème de cassis, marsala, moscato, pernod, porto, sauternes.',
    aliases: ['marsala', 'moscato', 'porto', 'sauternes', 'pernod', 'creme de cassis'],
  }),

  // --- Dolci e dolcificanti (con moderazione) ----------------------------
  lim('Cioccolato fondente 85%', 'dolci', { max: [20, 'g'], note: ACUTA, tags: ['cioccolato'] }),
  lim("Sciroppo d'acero", 'dolci', { max: [50, 'g'], note: '100%.' }),
  lim('Sciroppo di riso', 'dolci', { note: 'Con moderazione.' }),
  lim('Zucchero', 'dolci', { note: 'Con moderazione.' }),
  lim('Zucchero di canna integrale', 'dolci', { note: 'Con moderazione.' }),
  lim('Cacao amaro', 'dolci', { max: [8, 'g'], note: ACUTA, tags: ['cioccolato'] }),
  lim('Marmellata', 'dolci', { note: 'Un velo, come nella colazione 1.' }),
  no('Melassa', 'dolci'),
  no('Miele', 'dolci'),
  no("Sciroppo d'agave", 'dolci'),

  // --- Piatti e ricette del piano ----------------------------------------
  ok('Pancake con farine permesse', 'piatti', {
    note: "Farine di riso, mandorle o quinoa; senza zucchero né lievito nell'impasto.",
  }),
  ok('Porridge di quinoa', 'piatti'),
  ok('Pudding di riso', 'piatti'),
  ok('Torta di mandorle', 'piatti', { note: 'Contiene uova e olio EVO.' }),
  ok('Pinzimonio di carote', 'piatti'),
  ok('Panino con hamburger e insalata o cicoria', 'piatti', { note: 'Pane con farine consentite.' }),
  ok('Panino con tonno e pomodori o spinaci', 'piatti', { note: 'Pane con farine consentite.' }),
  check('Panino con melanzane e alici marinate', 'piatti', {
    note: 'Contiene melanzane (da verificare). Alici cotte.',
  }),
  ok('Pasta con zucchine e gamberetti', 'piatti', { note: 'Pasta con farine consentite.' }),
  ok('Insalata di patate con tonno, pomodori, carote e maionese', 'piatti'),
  ok('Pasta al ragù di carne', 'piatti', { note: 'Pasta con farine consentite.' }),
  ok('Pasta alle vongole', 'piatti', { note: 'Pasta con farine consentite.' }),
  ok('Polenta al ragù', 'piatti'),
  ok('Pesce al forno con patate', 'piatti'),
  check('Pasta con crema di zucca e granella di pistacchi', 'piatti', {
    note: 'Contiene pistacchi (da verificare).',
  }),
  ok('Verdure grigliate con crostini', 'piatti'),
  ok('Quinoa con verdure', 'piatti'),
  ok('Vellutata di zucca, carote e patate', 'piatti'),
]
