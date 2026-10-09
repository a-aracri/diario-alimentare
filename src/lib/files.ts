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

/** Condivisione in corso (il foglio di iOS si sta aprendo o è aperto). */
let sharing = false

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
    // Un secondo tocco mentre il foglio di condivisione si sta aprendo viene ignorato.
    if (sharing) return 'cancelled'
    sharing = true
    try {
      await navigator.share({ files: [file], title: file.name })
      return 'shared'
    } catch (err) {
      const name = (err as DOMException)?.name
      if (name === 'AbortError' || name === 'InvalidStateError') return 'cancelled'
      // Condivisione non riuscita: si prova con il download.
    } finally {
      sharing = false
    }
  }
  downloadFile(file)
  return 'downloaded'
}

/** Byte order mark: fa riconoscere a Excel/Numbers che il CSV è in UTF-8. */
export const UTF8_BOM = String.fromCharCode(0xfeff)
