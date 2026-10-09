import { FlameIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ACUTE_AVOID, ACUTE_TIPS } from '@/data/piano'

/** Banner della modalità "fase acuta gastrite/reflusso" con i consigli del piano. */
export function AcuteBanner() {
  return (
    <Alert className="border-orange-500/30 bg-orange-500/5 text-orange-700 dark:text-orange-400">
      <FlameIcon />
      <AlertTitle>Fase acuta gastrite/reflusso attiva</AlertTitle>
      <AlertDescription className="text-foreground/80">
        <details className="group">
          <summary className="flex min-h-9 cursor-pointer list-none items-center underline underline-offset-3 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Mostra i consigli</span>
            <span className="hidden group-open:inline">Nascondi i consigli</span>
          </summary>
          <AcuteAdvice />
        </details>
      </AlertDescription>
    </Alert>
  )
}

export function AcuteAdvice() {
  return (
    <div className="space-y-3 pt-1 text-sm">
      <div>
        <p className="font-medium text-foreground">Da evitare</p>
        <ul className="list-disc pl-5">
          {ACUTE_AVOID.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-medium text-foreground">Consigli</p>
        <ul className="list-disc pl-5">
          {ACUTE_TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
