import { InfoIcon, TriangleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { EntryWarning } from '@/lib/warnings'

/** Avvisi gentili: informano senza impedire il salvataggio. */
export function WarningList({ warnings, className }: { warnings: EntryWarning[]; className?: string }) {
  if (!warnings.length) return null
  return (
    <div className={cn('space-y-2', className)}>
      {warnings.map((w) => (
        <Alert
          key={w.code}
          className={cn(
            w.level === 'warning'
              ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400'
              : 'border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-400',
          )}
        >
          {w.level === 'warning' ? <TriangleAlertIcon /> : <InfoIcon />}
          <AlertDescription className="text-foreground/80">{w.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
