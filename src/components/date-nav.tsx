import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addDays, formatLong, relativeLabel, today } from '@/lib/dates'
import type { ISODate } from '@/model/types'

/** Navigazione tra i giorni; toccando la data si apre il selettore nativo. */
export function DateNav({ date, onChange }: { date: ISODate; onChange: (date: ISODate) => void }) {
  const t = today()
  const label = relativeLabel(date, t)
  const isRelative = label !== formatLong(date)
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="size-11"
        onClick={() => onChange(addDays(date, -1))}
        aria-label="Giorno precedente"
      >
        <ChevronLeftIcon className="size-5" />
      </Button>
      <div className="relative min-w-0 flex-1">
        <div className="flex h-11 flex-col items-center justify-center rounded-lg border bg-card px-2 text-center leading-tight">
          <span className="truncate text-sm font-medium first-letter:uppercase">{label}</span>
          {isRelative && (
            <span className="truncate text-xs text-muted-foreground">{formatLong(date)}</span>
          )}
        </div>
        <input
          type="date"
          aria-label="Scegli la data"
          value={date}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none text-base opacity-0"
        />
      </div>
      <Button
        variant="outline"
        size="icon"
        className="size-11"
        onClick={() => onChange(addDays(date, 1))}
        aria-label="Giorno successivo"
      >
        <ChevronRightIcon className="size-5" />
      </Button>
      {date !== t && (
        <Button variant="secondary" className="h-11" onClick={() => onChange(t)}>
          Oggi
        </Button>
      )}
    </div>
  )
}
