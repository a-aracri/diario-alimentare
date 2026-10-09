export type ShareResult = 'shared' | 'downloaded' | 'cancelled'

/** true su iPhone/iPad e telefoni: il foglio di condivisione accetta file. */
export function canShareFile(file: File): boolean {
  const touch = window.matchMedia?.('(pointer: coarse)').matches
  return !!touch && !!navigator.canShare?.({ files: [file] })
}

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Su iPhone apre il foglio di condivisione (Mail, WhatsApp, Salva su File…),
 * altrove scarica il file.
 *
 * Il file deve essere già pronto e la funzione va chiamata direttamente nel
 * gestore del tocco, senza `await` prima: Safari apre la condivisione solo se
 * parte dal gesto dell'utente.
 */
export async function shareFile(file: File): Promise<ShareResult> {
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title: file.name })
      return 'shared'
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled'
      // Condivisione non riuscita: si prova con il download.
    }
  }
  downloadFile(file)
  return 'downloaded'
}

/** Byte order mark: fa riconoscere a Excel/Numbers che il CSV è in UTF-8. */
export const UTF8_BOM = String.fromCharCode(0xfeff)
