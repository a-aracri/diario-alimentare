import { BellRingIcon, PillIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useSupplementLogs, useSupplements } from '@/hooks/use-data'
import { isReminderDue, supplementStatus } from '@/lib/supplements'
import { cn } from '@/lib/utils'
import type { ISODate } from '@/model/types'
import { repo } from '@/repo'

/** Ora corrente aggiornata ogni minuto, per i promemoria a orario. */
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Checklist giornaliera degli integratori, con promemoria visivo. */
export function SupplementsCard({ date }: { date: ISODate }) {
  const supplements = useSupplements()
  const logs = useSupplementLogs(date)
  const now = useNow()
  if (!supplements || !logs) return null

  const items = supplements
    .map((s) => ({
      s,
      status: supplementStatus(s, date),
      log: logs.find((l) => l.supplementId === s.id),
    }))
    .filter((i) => i.status.state === 'giornaliero' || i.status.state === 'al-bisogno')
  if (!items.length) return null

  const due = items.filter((i) => isReminderDue(i.s, date, !!i.log?.taken, now)).length

  return (
    <Card size="sm" className={cn(due > 0 && 'ring-amber-500/50')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PillIcon className="size-4" /> Integratori
          {due > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <BellRingIcon className="size-3.5" /> {due} da prendere
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 px-1.5">
        {items.map(({ s, status, log }) => {
          const taken = !!log?.taken
          const isDue = isReminderDue(s, date, taken, now)
          const detail =
            status.state === 'al-bisogno'
              ? 'al bisogno'
              : status.day && s.durationDays
                ? `giorno ${status.day} di ${s.durationDays}`
                : 'ogni giorno'
          return (
            <label
              key={s.id}
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-transparent px-2.5 py-1.5',
                isDue && 'border-amber-500/40 bg-amber-500/10',
              )}
            >
              <Checkbox
                checked={taken}
                onCheckedChange={(checked) => repo.supplements.setTaken(s.id, date, checked)}
                className="size-5"
              />
              <span className="min-w-0 flex-1">
                <span className={cn('block leading-snug font-medium', taken && 'text-muted-foreground line-through')}>
                  {s.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {s.timing} · {detail}
                  {taken && log?.time ? ` · preso alle ${log.time}` : ''}
                </span>
              </span>
              {isDue && <BellRingIcon className="size-4 shrink-0 text-amber-500" aria-label="Da prendere" />}
            </label>
          )
        })}
      </CardContent>
    </Card>
  )
}
