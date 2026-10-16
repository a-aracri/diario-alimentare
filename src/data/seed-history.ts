/**
 * Valori precedenti dei dati precaricati che sono stati corretti.
 *
 * Il seed aggiunge solo i record mancanti. Per correggere un alimento, un
 * integratore, una voce della lista della spesa o un limite del piano già
 * presente sul dispositivo, aggiungi qui com'era prima, con la versione del seed
 * che introduce la correzione (e incrementa SEED_VERSION in src/repo/seed.ts).
 * Al prossimo avvio il record (o il limite) prende i valori attuali di
 * ./fodmap.ts, ./piano.ts o ./spesa.ts solo se è ancora identico a quelli
 * precedenti, cioè se l'utente non l'ha modificato.
 */
import type { Limits } from '@/model/types'
import type { SeedFood } from './fodmap'
import type { SeedSupplement } from './piano'
import type { SeedShoppingItem } from './spesa'

export interface SeedRevision {
  /** Versione del seed che introduce la correzione. */
  version: number
  foods?: SeedFood[]
  supplements?: SeedSupplement[]
  shopping?: SeedShoppingItem[]
  /** Limiti precedenti: confrontati con `settings.limits`, campo per campo. */
  limits?: Partial<Limits>
}

const ACUTA = 'Sconsigliato in fase acuta di gastrite/reflusso.'
const POLIOLI = 'polioli (sorbitolo, mannitolo, maltitolo, xilitolo…)'

export const SEED_REVISIONS: SeedRevision[] = [
  {
    // Indicazioni aggiuntive della nutrizionista.
    version: 2,
    foods: [
      {
        id: 'pane-senza-glutine',
        name: 'Pane senza glutine',
        category: 'cereali',
        status: 'permesso',
        maxPortion: { amount: 100, unit: 'g' },
        note: 'Con farine consentite. Porzione 100 g.',
        aliases: ['panino', 'crostini'],
      },
      {
        id: 'crackers-senza-glutine',
        name: 'Crackers senza glutine',
        category: 'cereali',
        status: 'permesso',
        maxPortion: { amount: 100, unit: 'g' },
        note: 'Con farine consentite. Porzione 100 g.',
      },
      {
        id: 'biscotti-senza-glutine',
        name: 'Biscotti senza glutine',
        category: 'cereali',
        status: 'permesso',
        note: 'Con cereali consentiti: 2 nello spuntino, 6 a colazione.',
        aliases: ['biscotti'],
      },
      {
        id: 'cavolo-kale',
        name: 'Cavolo kale',
        category: 'verdure',
        status: 'permesso',
        aliases: ['cavolo nero'],
      },
      {
        id: 'melanzane',
        name: 'Melanzane',
        category: 'verdure',
        status: 'verificare',
        note: 'Compaiono nelle idee del piano ma non nella lista dei permessi.',
        aliases: ['melanzana'],
      },
      {
        id: 'ciliegie',
        name: 'Ciliegie',
        category: 'frutta',
        status: 'verificare',
        maxPortion: { amount: 20, unit: 'g' },
        note: 'Compaiono sia tra i permessi sia tra quelli da evitare.',
        tags: ['frutto'],
      },
      {
        id: 'more',
        name: 'More',
        category: 'frutta',
        status: 'verificare',
        maxPortion: { amount: 32, unit: 'g' },
        note: 'Compaiono sia tra i permessi sia tra quelli da evitare.',
        tags: ['frutto'],
      },
      { id: 'salsa-di-soia', name: 'Salsa di soia', category: 'condimenti', status: 'permesso' },
      {
        id: 'te-verde',
        name: 'Tè verde',
        category: 'bevande',
        status: 'limite',
        maxPortion: { amount: 250, unit: 'g' },
        note: ACUTA,
        tags: ['te'],
      },
      {
        id: 'panino-con-melanzane-e-alici-marinate',
        name: 'Panino con melanzane e alici marinate',
        category: 'piatti',
        status: 'verificare',
        note: 'Contiene melanzane (da verificare). Alici cotte.',
      },
    ],
    supplements: [
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
    ],
  },
  {
    // Nuove regole della nutrizionista: uova, patate e colazioni.
    version: 4,
    limits: { eggsPerWeek: 6 },
    foods: [
      {
        id: 'patate',
        name: 'Patate',
        category: 'cereali',
        status: 'permesso',
        maxPortion: { amount: 100, unit: 'g' },
        note: 'Porzione 100 g. Evitare gli integrali.',
        aliases: ['patata'],
      },
      {
        id: 'gallette-di-riso-o-mais',
        name: 'Gallette di riso o mais',
        category: 'cereali',
        status: 'permesso',
        aliases: ['gallette'],
      },
      {
        id: 'biscotti-senza-glutine',
        name: 'Biscotti senza glutine',
        category: 'cereali',
        status: 'permesso',
        note: `Con cereali consentiti: 2 nello spuntino, 6 a colazione. Se confezionati, controlla che in etichetta non ci siano ${POLIOLI}.`,
        aliases: ['biscotti'],
      },
      {
        id: 'uova',
        name: 'Uova',
        category: 'proteine',
        status: 'limite',
        note: 'Max 6 a settimana.',
        tags: ['uovo'],
        aliases: ['uovo', 'frittata'],
      },
      { id: 'margarina', name: 'Margarina', category: 'condimenti', status: 'permesso' },
      {
        id: 'marmellata',
        name: 'Marmellata',
        category: 'dolci',
        status: 'limite',
        note: 'Un velo, come nella colazione 1.',
      },
      {
        id: 'pancake-con-farine-permesse',
        name: 'Pancake con farine permesse',
        category: 'piatti',
        status: 'permesso',
        note: "Farine di riso, mandorle o quinoa; senza zucchero né lievito nell'impasto.",
      },
    ],
    shopping: [
      { id: 'uova', name: 'Uova', section: 'carne-pesce', note: 'Max 6 a settimana.' },
      {
        id: 'farina-di-mandorle',
        name: 'Farina di mandorle',
        section: 'farine',
        note: 'Per la torta di mandorle e i pancake.',
      },
      { id: 'margarina', name: 'Margarina', section: 'dispensa' },
    ],
  },
]
