export type ShareResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * Su iPhone apre il foglio di condivisione (Salva su File, Mail, AirDrop…),
 * altrove scarica il file.
 */
export async function shareOrDownload(
  filename: string,
  content: string,
  mime: string,
): Promise<ShareResult> {
  const file = new File([content], filename, { type: mime })
  const touch = window.matchMedia?.('(pointer: coarse)').matches
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled'
      // Condivisione non riuscita: si prova con il download.
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

export function readFileText(file: File): Promise<string> {
  return file.text()
}
