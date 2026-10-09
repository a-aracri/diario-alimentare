import { toast } from 'sonner'
import { registerSW } from 'virtual:pwa-register'

/**
 * Registra il service worker (funzionamento offline). Quando è pronta una
 * nuova versione chiede di aggiornare, per non interrompere un inserimento.
 */
export function registerServiceWorker() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast('Nuova versione disponibile', {
        duration: Infinity,
        action: { label: 'Aggiorna', onClick: () => updateSW(true) },
      })
    },
    onOfflineReady() {
      toast.success('App pronta per l’uso offline')
    },
  })
}
