/**
 * Valori precedenti dei dati precaricati che sono stati corretti.
 *
 * Il seed aggiunge solo i record mancanti. Per correggere un alimento o un
 * integratore già presente sul dispositivo, aggiungi qui com'era prima, con la
 * versione del seed che introduce la correzione (e incrementa SEED_VERSION in
 * src/repo/seed.ts). Al prossimo avvio il record prende i valori attuali di
 * ./fodmap.ts o ./piano.ts solo se è ancora identico a quelli precedenti, cioè
 * se l'utente non l'ha modificato.
 */
import type { SeedFood } from './fodmap'
import type { SeedSupplement } from './piano'

export interface SeedRevision {
  /** Versione del seed che introduce la correzione. */
  version: number
  foods?: SeedFood[]
  supplements?: SeedSupplement[]
}

const ACUTA = 'Sconsigliato in fase acuta di gastrite/reflusso.'

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
]
