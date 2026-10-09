import { CheckCircle2Icon, ChevronLeftIcon, ChevronRightIcon, FileDownIcon, PrinterIcon, TriangleAlertIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Page, SectionTitle } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useReportData, useSettings } from '@/hooks/use-data'
import { navigate } from '@/hooks/use-route'
import { useSelectedDate } from '@/hooks/selected-date'
import { addDays, formatFull, formatLong, parseISODate, today, weekStart } from '@/lib/dates'
import { shareOrDownload } from '@/lib/files'
import { buildFoodIndex } from '@/lib/foods'
import { weekAdherence } from '@/lib/limits'
import { adherenceLines, buildCSV, buildDayReports, symptomLabel } from '@/lib/report'
import { formatQuantity } from '@/lib/units'
import { MEAL_LABEL, MEALS } from '@/model/constants'
import type { ISODate } from '@/model/types'
import { repo } from '@/repo'

const rangeFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })

export function SummaryPage() {
  const { date } = useSelectedDate()
  const settings = useSettings()
  const [from, setFrom] = useState(() => weekStart(date))
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
    <Page title="Riepilogo" subtitle="Settimana da lunedì a domenica">
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
      <ExportCard defaultFrom={from} defaultTo={to} />
    </Page>
  )
}

function ExportCard({ defaultFrom, defaultTo }: { defaultFrom: ISODate; defaultTo: ISODate }) {
  const settings = useSettings()
  const [range, setRange] = useState<{ from?: ISODate; to?: ISODate }>({})
  const from = range.from ?? settings?.dietStartDate ?? defaultFrom
  const to = range.to ?? (defaultTo > today() ? today() : defaultTo)
  const valid = from <= to

  async function exportCSV() {
    const [entries, symptoms, dayLogs, supplements, supplementLogs, foods] = await Promise.all([
      repo.entries.byRange(from, to),
      repo.symptoms.byRange(from, to),
      repo.dayLogs.byRange(from, to),
      repo.supplements.all(),
      repo.supplements.logsByRange(from, to),
      repo.foods.all(),
    ])
    const csv = buildCSV({ entries, symptoms, dayLogs, supplements, supplementLogs, foods }, from, to)
    const result = await shareOrDownload(`diario-fodmap-${from}_${to}.csv`, `﻿${csv}`, 'text/csv')
    if (result !== 'cancelled') toast.success('CSV esportato')
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">Esporta un periodo</CardTitle>
        <CardDescription>
          CSV per Excel/Numbers oppure una vista stampabile da salvare in PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="export-from">Dal</FieldLabel>
            <Input id="export-from" type="date" value={from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel htmlFor="export-to">Al</FieldLabel>
            <Input id="export-to" type="date" value={to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
          </Field>
        </div>
        {!valid && <p className="text-sm text-destructive">La data di inizio è successiva a quella di fine.</p>}
        <p className="text-xs text-muted-foreground">
          Periodo: {formatFull(from)} – {formatFull(to)}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" disabled={!valid} onClick={exportCSV}>
            <FileDownIcon /> CSV
          </Button>
          <Button className="h-11" disabled={!valid} onClick={() => navigate(`/stampa?da=${from}&a=${to}`)}>
            <PrinterIcon /> Stampa / PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
