import { useEffect, useEffectEvent, useState } from 'react'

export type PreparedFile =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'ready'; file: File }
  | { status: 'error' }

/**
 * Prepara un file in anticipo, ogni volta che `key` cambia (null = niente da
 * preparare). Così il tocco su "Condividi" apre subito il foglio di
 * condivisione: su iPhone Safari lo consente solo se parte dal gesto, senza
 * attese in mezzo.
 */
export function usePreparedFile(
  key: string | null,
  build: () => Promise<File> | File,
  delayMs = 250,
): PreparedFile {
  const [result, setResult] = useState<{ key: string; file?: File } | null>(null)
  const onBuild = useEffectEvent(build)

  useEffect(() => {
    if (key == null) return
    let cancelled = false
    // Breve attesa: se l'utente cambia di nuovo il periodo, non si prepara due volte.
    const timer = setTimeout(async () => {
      try {
        const file = await onBuild()
        if (!cancelled) setResult({ key, file })
      } catch (err) {
        console.error(err)
        if (!cancelled) setResult({ key })
      }
    }, delayMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [key, delayMs])

  if (key == null) return { status: 'idle' }
  if (result?.key !== key) return { status: 'preparing' }
  return result.file ? { status: 'ready', file: result.file } : { status: 'error' }
}
