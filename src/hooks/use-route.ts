import { useSyncExternalStore } from 'react'

/**
 * Router minimale basato sull'hash (#/percorso?param=valore): funziona su
 * GitHub Pages senza configurazioni lato server e offline.
 */
export interface Route {
  path: string
  params: URLSearchParams
}

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

function getHash() {
  return window.location.hash
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/'
  const [path, query = ''] = raw.split('?')
  return { path: path || '/', params: new URLSearchParams(query) }
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash)
  return parseHash(hash)
}

export function navigate(to: string) {
  window.location.hash = to
  window.scrollTo({ top: 0 })
}

export function href(to: string) {
  return `#${to}`
}
