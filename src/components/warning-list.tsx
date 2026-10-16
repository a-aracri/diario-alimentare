import { InfoIcon, TriangleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { EntryWarning } from '@/lib/warnings'

const NOTICE_STYLE: Record<EntryWarning['level'], string> = {
  warning: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
  info: 'border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-400',
}

/** Riquadro di avviso (ambra) o di informazione "da verificare" (azzurro). */
export function Notice({ level, children }: { level: EntryWarning['level']; children: React.ReactNode }) {
  return (
    <Alert className={NOTICE_STYLE[level]}>
      {level === 'warning' ? <TriangleAlertIcon /> : <InfoIcon />}
      <AlertDescription className="text-foreground/80">{children}</AlertDescription>
    </Alert>
  )
}

/** Avvisi gentili: informano senza impedire il salvataggio. */
export function WarningList({ warnings, className }: { warnings: EntryWarning[]; className?: string }) {
  if (!warnings.length) return null
  return (
    <div className={cn('space-y-2', className)}>
      {warnings.map((w) => (
        <Notice key={w.code} level={w.level}>
          {w.message}
        </Notice>
      ))}
    </div>
  )
}
