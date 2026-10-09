import { useTheme } from 'next-themes'
import { useEffect } from 'react'

const COLORS = { light: '#ffffff', dark: '#0a0a0a' }

/** Allinea il colore della barra di sistema al tema scelto nell'app. */
export function ThemeColor() {
  const { resolvedTheme } = useTheme()
  useEffect(() => {
    const color = resolvedTheme === 'dark' ? COLORS.dark : COLORS.light
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color))
  }, [resolvedTheme])
  return null
}
