import { createContext, useContext } from 'react'

/**
 * Diario semplice (`settings.simpleMode`): solo diario e sintomi, senza il piano
 * (limiti, integratori, stati degli alimenti, idee, spesa, reintroduzione).
 * Il valore arriva da App, che aspetta le impostazioni prima di mostrare le pagine.
 */
export const SimpleModeContext = createContext(false)

export function useSimpleMode(): boolean {
  return useContext(SimpleModeContext)
}
