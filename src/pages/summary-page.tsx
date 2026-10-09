import { CheckCircle2Icon, ChevronLeftIcon, ChevronRightIcon, ShareIcon, TriangleAlertIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Page, SectionTitle } from '@/components/page'
import { ShareDiaryDrawer } from '@/components/share-diary-drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useReportData, useSettings } from '@/hooks/use-data'
import { href, useRoute } from '@/hooks/use-route'
import { useSelectedDate } from '@/hooks/selected-date'
import { addDays, formatLong, parseISODate, today, weekStart } from '@/lib/dates'
import { buildFoodIndex } from '@/lib/foods'
import { weekAdherence } from '@/lib/limits'
import { adherenceLines, buildDayReports, symptomLabel } from '@/lib/report'
import { formatQuantity } from '@/lib/units'
import { MEAL_LABEL, MEALS } from '@/model/constants'

const rangeFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })

export function SummaryPage() {
  const { date } = useSelectedDate()
  const { params } = useRoute()
  const settings = useSettings()
  const [from, setFrom] = useState(() => weekStart(date))
  const [sharing, setSharing] = useState(() => params.get('condividi') === '1')

  // Il link "Condividi il diario" apre il drawer una volta: dopo un ricaricamento non deve riaprirsi.
  const fromShareLink = params.has('condividi')
  useEffect(() => {
    if (fromShareLink) history.replaceState(null, '', href('/riepilogo'))
  }, [fromShareLink])
  const to = addDays(from, 6)
  const data = useReportData(from, to)

  const view = useMemo(() => {
    if (!data || !settings) return undefined
    const index = buildFoodIndex(data.foods)
    return {
      days: buildDayReports(data, from, to),
      lines: adherenceLines(weekAdherence(data.entries, index, settings.limits), settings.limits),
    }
  }, [data, settings, from, to])

  const label = `${rangeFmt.format(parseISODate(from))} – ${rangeFmt.format(parseISODate(to))}`
  const isCurrent = from === weekStart(today())

  return (
    <Page
      title="Riepilogo"
      subtitle="Settimana da lunedì a domenica"
      actions={
        <Button variant="outline" size="icon" className="size-11" onClick={() => setSharing(true)} aria-label="Condividi il diario">
          <ShareIcon className="size-5" />
        </Button>
      }
    >
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="size-11" onClick={() => setFrom(addDays(from, -7))} aria-label="Settimana precedente">
          <ChevronLeftIcon className="size-5" />
        </Button>
        <div className="flex h-11 flex-1 items-center justify-center rounded-lg border bg-card text-sm font-medium">
          {label}
        </div>
        <Button variant="outline" size="icon" className="size-11" onClick={() => setFrom(addDays(from, 7))} aria-label="Settimana successiva">
          <ChevronRightIcon className="size-5" />
        </Button>
        {!isCurrent && (
          <Button variant="secondary" className="h-11" onClick={() => setFrom(weekStart(today()))}>
            Oggi
          </Button>
        )}
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Aderenza ai limiti</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {view?.lines.map((l) => (
              <li key={l.id} className="flex items-start gap-2.5">
                {l.ok ? (
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{l.label}</span>
                  <span className="block text-xs text-muted-foreground">{l.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <SectionTitle>Giorno per giorno</SectionTitle>
      {view?.days.map((day) => {
        const meals = MEALS.map((m) => ({ ...m, entries: day.entries.filter((e) => e.meal === m.id) })).filter(
          (m) => m.entries.length,
        )
        const empty = !meals.length && !day.symptoms.length && !day.noSymptoms
        return (
          <Card key={day.date} size="sm" className={empty ? 'opacity-60' : undefined}>
            <CardHeader>
              <CardTitle className="text-sm font-semibold first-letter:uppercase">{formatLong(day.date)}</CardTitle>
              {empty && <CardDescription>Nessun dato</CardDescription>}
            </CardHeader>
            {!empty && (
              <CardContent className="space-y-2 text-sm">
                {(day.symptoms.length > 0 || day.noSymptoms) && (
                  <div className="flex flex-wrap gap-1.5">
                    {day.noSymptoms && (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        Nessun sintomo
                      </Badge>
                    )}
                    {day.symptoms.map((s) => (
                      <Badge key={s.id} variant="outline">
                        {s.time} {symptomLabel(s)} {s.type === 'feci' ? `· Bristol ${s.bristol}` : `· ${s.intensity}/10`}
                      </Badge>
                    ))}
                  </div>
                )}
                {meals.map((m) => (
                  <p key={m.id}>
                    <span className="font-medium">{MEAL_LABEL[m.id]}:</span>{' '}
                    <span className="text-muted-foreground">
                      {m.entries
                        .map((e) => (e.quantity != null ? `${e.name} (${formatQuantity(e.quantity, e.unit)})` : e.name))
                        .join(', ')}
                    </span>
                  </p>
                ))}
                {day.supplementsTaken.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Integratori: {day.supplementsTaken.map((s) => s.name).join(', ')}
                  </p>
                )}
                {day.note && <p className="text-xs text-muted-foreground">Note: {day.note}</p>}
              </CardContent>
            )}
          </Card>
        )
      })}

      <SectionTitle>Per la nutrizionista</SectionTitle>
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Condividi il diario</CardTitle>
          <CardDescription>
            Scegli il periodo e invia un PDF leggibile con Mail, WhatsApp o salvalo in File.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="h-11 w-full" onClick={() => setSharing(true)}>
            <ShareIcon /> Condividi il diario
          </Button>
        </CardContent>
      </Card>

      <ShareDiaryDrawer open={sharing} onOpenChange={setSharing} />
    </Page>
  )
}
