import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { today } from '@/lib/dates'
import type { ISODate } from '@/model/types'

interface SelectedDate {
  date: ISODate
  setDate: (date: ISODate) => void
}

const Ctx = createContext<SelectedDate | null>(null)

/**
 * Data selezionata, condivisa tra Diario e Sintomi. Se l'utente sta guardando
 * "oggi", quando riapre l'app il giorno dopo passa automaticamente alla nuova data.
 */
export function SelectedDateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => ({ date: today(), followToday: true }))

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      setState((s) => (s.followToday && s.date !== today() ? { date: today(), followToday: true } : s))
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const setDate = useCallback((date: ISODate) => {
    setState({ date, followToday: date === today() })
  }, [])

  const value = useMemo(() => ({ date: state.date, setDate }), [state.date, setDate])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSelectedDate(): SelectedDate {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSelectedDate deve essere usato dentro SelectedDateProvider')
  return ctx
}
