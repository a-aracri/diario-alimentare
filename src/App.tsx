import { lazy, Suspense, useEffect, useState } from 'react'
import { BottomNav } from '@/components/bottom-nav'
import { ThemeColor } from '@/components/theme-color'
import { Button } from '@/components/ui/button'
import { useRoute } from '@/hooks/use-route'
import { DiaryPage } from '@/pages/diary-page'
import { SymptomsPage } from '@/pages/symptoms-page'
import { repo } from '@/repo'

// Pagine meno usate caricate su richiesta (restano comunque disponibili offline).
const IdeasPage = lazy(() => import('@/pages/ideas-page').then((m) => ({ default: m.IdeasPage })))
const SummaryPage = lazy(() => import('@/pages/summary-page').then((m) => ({ default: m.SummaryPage })))
const MorePage = lazy(() => import('@/pages/more-page').then((m) => ({ default: m.MorePage })))
const SupplementsPage = lazy(() =>
  import('@/pages/supplements-page').then((m) => ({ default: m.SupplementsPage })),
)
const ReintroPage = lazy(() => import('@/pages/reintro-page').then((m) => ({ default: m.ReintroPage })))
const FoodsPage = lazy(() => import('@/pages/foods-page').then((m) => ({ default: m.FoodsPage })))
const SettingsPage = lazy(() => import('@/pages/settings-page').then((m) => ({ default: m.SettingsPage })))
const PrintPage = lazy(() => import('@/pages/print-page').then((m) => ({ default: m.PrintPage })))

const ROUTES: Record<string, React.ComponentType> = {
  '/': DiaryPage,
  '/sintomi': SymptomsPage,
  '/idee': IdeasPage,
  '/riepilogo': SummaryPage,
  '/altro': MorePage,
  '/integratori': SupplementsPage,
  '/reintroduzione': ReintroPage,
  '/alimenti': FoodsPage,
  '/impostazioni': SettingsPage,
}

export default function App() {
  const route = useRoute()
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    repo
      .init()
      .then(() => setState('ready'))
      .catch((err) => {
        console.error(err)
        setState('error')
      })
    // Chiede al browser di non cancellare i dati locali in caso di poco spazio.
    navigator.storage?.persist?.().catch(() => {})
  }, [])

  if (state === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-medium">Impossibile aprire il database locale.</p>
        <p className="text-sm text-muted-foreground">
          Controlla che il browser non sia in navigazione privata e riprova.
        </p>
        <Button className="h-11" onClick={() => window.location.reload()}>
          Riprova
        </Button>
      </div>
    )
  }
  if (state === 'loading') return <div className="min-h-dvh bg-background" />

  if (route.path === '/stampa') {
    return (
      <Suspense fallback={null}>
        <PrintPage params={route.params} />
      </Suspense>
    )
  }

  const Current = ROUTES[route.path] ?? DiaryPage
  return (
    <>
      <ThemeColor />
      <Suspense fallback={<div className="min-h-dvh" />}>
        <Current />
      </Suspense>
      <BottomNav path={route.path} />
    </>
  )
}
