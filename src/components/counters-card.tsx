import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Counter } from '@/lib/limits'
import { formatNumber } from '@/lib/units'
import { cn } from '@/lib/utils'

/** Contatori dei limiti del piano (olio, uova, latticini, frutta negli spuntini). */
export function CountersCard({ counters }: { counters: Counter[] }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">Limiti del piano</CardTitle>
        <CardDescription>
          Uova e latticini contano da lunedì a domenica. Ricorda di registrare anche l’olio EVO.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3">
        {counters.map((c) => (
          <div key={c.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs leading-tight text-muted-foreground">{c.label}</span>
              <span
                className={cn(
                  'shrink-0 text-sm font-medium tabular-nums',
                  c.over && 'text-amber-600 dark:text-amber-400',
                )}
              >
                {formatNumber(c.value)}/{c.max}
              </span>
            </div>
            <Progress
              value={Math.min(100, c.max ? (c.value / c.max) * 100 : 0)}
              aria-label={`${c.label}: ${formatNumber(c.value)} su ${c.max} ${c.unit} (${c.period})`}
              className={cn(c.over && '**:data-[slot=progress-indicator]:bg-amber-500')}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
