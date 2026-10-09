import { ArrowLeftIcon, PrinterIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useReportData, useSettings } from '@/hooks/use-data'
import { navigate } from '@/hooks/use-route'
import { today, weekStart } from '@/lib/dates'
import { buildReportDocument } from '@/lib/report-document'
import type { ISODate } from '@/model/types'

/**
 * Vista stampabile per un intervallo di date, con gli stessi contenuti del PDF
 * condivisibile. Colori fissi chiari, indipendenti dal tema.
 */
export function PrintPage({ params }: { params: URLSearchParams }) {
  const to: ISODate = params.get('a') ?? today()
  const from: ISODate = params.get('da') ?? weekStart(to)
  const settings = useSettings()
  const data = useReportData(from, to)

  const doc = useMemo(
    () => (data && settings && from <= to ? buildReportDocument(data, from, to, { settings }) : undefined),
    [data, settings, from, to],
  )

  return (
    <div className="min-h-dvh bg-white text-neutral-900 print:min-h-0">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-neutral-200 bg-white/95 px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 backdrop-blur print:hidden">
        <Button variant="ghost" className="h-11 text-neutral-900" onClick={() => navigate('/riepilogo')}>
          <ArrowLeftIcon /> Indietro
        </Button>
        <Button className="ml-auto h-11" onClick={() => window.print()}>
          <PrinterIcon /> Stampa
        </Button>
      </div>
      <p className="px-4 pt-3 text-xs text-neutral-500 print:hidden">
        Per inviare il diario è più comodo “Condividi PDF” dal Riepilogo.
      </p>

      {doc && (
        <article className="mx-auto max-w-3xl space-y-6 px-4 py-6 text-sm print:max-w-none print:p-0">
          <header className="space-y-1">
            <h1 className="text-xl font-semibold">{doc.title}</h1>
            <p className="text-base">{doc.period}</p>
            {doc.meta.map((m) => (
              <p key={m} className="text-xs text-neutral-500">
                {m}
              </p>
            ))}
          </header>

          {doc.summary.length > 0 && (
            <section className="break-inside-avoid space-y-2">
              <h2 className="font-semibold">Riepilogo del periodo</h2>
              <dl className="grid grid-cols-[minmax(0,12rem)_1fr] gap-x-4 gap-y-1">
                {doc.summary.map((s) => (
                  <div key={s.label} className="contents">
                    <dt className="font-medium">{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {doc.weeks.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">Limiti del piano</h2>
              {doc.weeks.map((w) => (
                <div key={w.title} className="break-inside-avoid space-y-1 rounded-lg border border-neutral-300 p-3">
                  <h3 className="font-medium">{w.title}</h3>
                  {w.note && <p className="text-xs text-neutral-500">{w.note}</p>}
                  <ul className="grid gap-1">
                    {w.lines.map((l) => (
                      <li key={l.id} className="grid grid-cols-[5.5rem_1fr] gap-2">
                        <span className={`font-semibold ${l.ok ? 'text-emerald-800' : 'text-amber-800'}`}>
                          {l.ok ? 'OK' : 'Da rivedere'}
                        </span>
                        <span>
                          <strong>{l.label}:</strong> {l.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {doc.days.map((day) => (
            <section key={day.date} className="break-inside-avoid space-y-2">
              <h2 className="border-b border-neutral-300 pb-1 text-base font-semibold">{day.title}</h2>
              {day.empty && <p className="text-neutral-500">Nessun dato registrato.</p>}
              {day.rows.length > 0 && (
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
                    {day.rows.map((r, i) => (
                      <tr key={i} className="border-b border-neutral-100 align-top">
                        <td className="py-1 pr-2 tabular-nums">{r.time}</td>
                        <td className="py-1 pr-2">{r.meal}</td>
                        <td className="py-1 pr-2">
                          {r.food}
                          {r.flag && <span className="block text-xs text-amber-700">{r.flag}</span>}
                        </td>
                        <td className="py-1 pr-2 whitespace-nowrap">{r.quantity}</td>
                        <td className="py-1">{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {day.noSymptoms && <p className="font-medium text-emerald-700">Nessun sintomo.</p>}
              {day.symptoms.length > 0 && (
                <div>
                  <p className="font-medium">{day.symptomsTitle}</p>
                  <ul className="list-disc pl-5">
                    {day.symptoms.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {day.supplements.length > 0 && (
                <p>
                  <span className="font-medium">Integratori:</span> {day.supplements.join(', ')}
                </p>
              )}
              {day.note && (
                <p>
                  <span className="font-medium">Note:</span> {day.note}
                </p>
              )}
            </section>
          ))}
        </article>
      )}
    </div>
  )
}
