import { ArrowLeftIcon, PrinterIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useReportData, useSettings } from '@/hooks/use-data'
import { navigate } from '@/hooks/use-route'
import { addDays, formatFull, formatLong, today, weekStart } from '@/lib/dates'
import { buildFoodIndex, resolveFood } from '@/lib/foods'
import { exceedsPortion, weekAdherence } from '@/lib/limits'
import { adherenceLines, buildDayReports, symptomLabel } from '@/lib/report'
import { formatQuantity } from '@/lib/units'
import { BRISTOL, MEAL_LABEL, STATUS_LABEL } from '@/model/constants'
import type { ISODate } from '@/model/types'

/**
 * Vista stampabile per un intervallo di date: si stampa o si salva in PDF dal
 * browser. Colori fissi chiari, indipendenti dal tema.
 */
export function PrintPage({ params }: { params: URLSearchParams }) {
  const to: ISODate = params.get('a') ?? today()
  const from: ISODate = params.get('da') ?? weekStart(to)
  const settings = useSettings()
  const data = useReportData(from, to)

  const report = useMemo(() => {
    if (!data || !settings) return undefined
    const index = buildFoodIndex(data.foods)
    const days = buildDayReports(data, from, to)
    // Aderenza per settimana (lunedì–domenica), limitata all'intervallo scelto.
    const weeks: { start: ISODate; end: ISODate; lines: ReturnType<typeof adherenceLines> }[] = []
    for (let start = weekStart(from); start <= to; start = addDays(start, 7)) {
      const s = start < from ? from : start
      const e = addDays(start, 6) > to ? to : addDays(start, 6)
      const entries = data.entries.filter((x) => x.date >= s && x.date <= e)
      weeks.push({ start: s, end: e, lines: adherenceLines(weekAdherence(entries, index, settings.limits), settings.limits) })
    }
    return { index, days, weeks }
  }, [data, settings, from, to])

  return (
    <div className="min-h-dvh bg-white text-neutral-900 print:min-h-0">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-neutral-200 bg-white/95 px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 backdrop-blur print:hidden">
        <Button variant="ghost" className="h-11 text-neutral-900" onClick={() => navigate('/riepilogo')}>
          <ArrowLeftIcon /> Indietro
        </Button>
        <Button className="ml-auto h-11" onClick={() => window.print()}>
          <PrinterIcon /> Stampa / Salva PDF
        </Button>
      </div>
      <p className="px-4 pt-3 text-xs text-neutral-500 print:hidden">
        Su iPhone: Stampa → nell’anteprima allarga la pagina con due dita e usa Condividi → Salva su File per ottenere il PDF.
      </p>

      <article className="mx-auto max-w-3xl space-y-6 px-4 py-6 text-sm print:max-w-none print:p-0">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Diario alimentare – dieta Low FODMAP</h1>
          <p>
            Periodo: <strong>{formatFull(from)}</strong> – <strong>{formatFull(to)}</strong>
          </p>
          {settings?.dietStartDate && <p>Inizio della dieta: {formatFull(settings.dietStartDate)}</p>}
        </header>

        {report?.weeks.map((w) => (
          <section key={w.start} className="break-inside-avoid space-y-2 rounded-lg border border-neutral-300 p-3">
            <h2 className="font-semibold">
              Aderenza ai limiti · {formatFull(w.start)} – {formatFull(w.end)}
            </h2>
            <ul className="grid gap-1 sm:grid-cols-2 print:grid-cols-2">
              {w.lines.map((l) => (
                <li key={l.id}>
                  <span className={l.ok ? 'text-emerald-700' : 'text-amber-700'}>{l.ok ? '✓' : '⚠'}</span>{' '}
                  <strong>{l.label}:</strong> {l.detail}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {report?.days.map((day) => {
          const nothing = !day.entries.length && !day.symptoms.length && !day.noSymptoms && !day.note
          return (
            <section key={day.date} className="break-inside-avoid space-y-2">
              <h2 className="border-b border-neutral-300 pb-1 text-base font-semibold first-letter:uppercase">
                {formatLong(day.date)} <span className="font-normal text-neutral-500">({formatFull(day.date)})</span>
              </h2>
              {nothing && <p className="text-neutral-500">Nessun dato registrato.</p>}
              {day.entries.length > 0 && (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-neutral-300 text-xs text-neutral-500">
                      <th className="py-1 pr-2 font-medium">Ora</th>
                      <th className="py-1 pr-2 font-medium">Pasto</th>
                      <th className="py-1 pr-2 font-medium">Alimento</th>
                      <th className="py-1 pr-2 font-medium">Quantità</th>
                      <th className="py-1 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.entries.map((e) => {
                      const food = report.index && resolveFood(e, report.index)
                      const flag =
                        food?.status === 'evitare' || food?.status === 'verificare'
                          ? STATUS_LABEL[food.status].toLowerCase()
                          : exceedsPortion(e, food)
                            ? 'oltre la porzione'
                            : ''
                      return (
                        <tr key={e.id} className="border-b border-neutral-100 align-top">
                          <td className="py-1 pr-2 tabular-nums">{e.time}</td>
                          <td className="py-1 pr-2">{MEAL_LABEL[e.meal]}</td>
                          <td className="py-1 pr-2">
                            {e.name}
                            {flag && <span className="text-amber-700"> ⚠ {flag}</span>}
                          </td>
                          <td className="py-1 pr-2 whitespace-nowrap">{formatQuantity(e.quantity, e.unit)}</td>
                          <td className="py-1">{e.note}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              {(day.symptoms.length > 0 || day.noSymptoms) && (
                <div>
                  <p className="font-medium">Sintomi e feci</p>
                  {day.noSymptoms && <p>Nessun sintomo.</p>}
                  <ul className="list-disc pl-5">
                    {day.symptoms.map((s) => (
                      <li key={s.id}>
                        {s.time} – {symptomLabel(s)}
                        {s.type === 'feci'
                          ? `: Bristol ${s.bristol} (${BRISTOL[(s.bristol ?? 1) - 1]?.label.toLowerCase()})`
                          : `: intensità ${s.intensity}/10`}
                        {s.note && ` – ${s.note}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {day.supplementsTaken.length > 0 && (
                <p>
                  <span className="font-medium">Integratori:</span>{' '}
                  {day.supplementsTaken.map((s) => (s.time ? `${s.name} (${s.time})` : s.name)).join(', ')}
                </p>
              )}
              {day.note && (
                <p>
                  <span className="font-medium">Note:</span> {day.note}
                </p>
              )}
            </section>
          )
        })}
      </article>
    </div>
  )
}
