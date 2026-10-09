import { FileSpreadsheetIcon, FileTextIcon, Loader2Icon, PrinterIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useReportData, useSettings } from '@/hooks/use-data'
import { usePreparedFile, type PreparedFile } from '@/hooks/use-prepared-file'
import { navigate } from '@/hooks/use-route'
import { addDays, dateRange, diffDays, today } from '@/lib/dates'
import { shareFile, UTF8_BOM } from '@/lib/files'
import { renderReportPdf } from '@/lib/pdf-report'
import { buildCSV, reportSignature } from '@/lib/report'
import { buildReportDocument, capitalize, periodLabel, reportFileName } from '@/lib/report-document'
import type { ISODate, Settings } from '@/model/types'
import { cn } from '@/lib/utils'
import { FormDrawer } from './form-drawer'

interface ShareDiaryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Condivisione del diario per un periodo: PDF leggibile, anteprima di stampa o CSV. */
export function ShareDiaryDrawer({ open, onOpenChange }: ShareDiaryDrawerProps) {
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Condividi il diario"
      description="Scegli il periodo e invialo, ad esempio alla nutrizionista."
      className="max-h-[92dvh]"
    >
      <ShareDiaryForm />
    </FormDrawer>
  )
}

interface Range {
  from: ISODate
  to: ISODate
}

function presets(t: ISODate, dietStart?: ISODate): (Range & { id: string; label: string })[] {
  return [
    { id: '7', label: 'Ultimi 7 giorni', from: addDays(t, -6), to: t },
    { id: '14', label: 'Ultime 2 settimane', from: addDays(t, -13), to: t },
    { id: '30', label: 'Ultimo mese', from: addDays(t, -29), to: t },
    ...(dietStart && dietStart <= t
      ? [{ id: 'dieta', label: 'Dall’inizio della dieta', from: dietStart, to: t }]
      : []),
  ]
}

/** Periodo proposto: dall'inizio della dieta se recente, altrimenti le ultime 2 settimane. */
function defaultRange(t: ISODate, settings?: Settings): Range {
  const start = settings?.dietStartDate
  if (start && start <= t && diffDays(start, t) < 60) return { from: start, to: t }
  return { from: addDays(t, -13), to: t }
}

function ShareDiaryForm() {
  const settings = useSettings()
  const t = today()
  const [chosen, setChosen] = useState<Range | null>(null)
  const range = chosen ?? defaultRange(t, settings)
  const { from, to } = range
  const valid = from <= to
  const data = useReportData(from, to)

  const ready = valid && data && settings
  const signature = ready ? `${from}|${to}|${reportSignature(data, settings.updatedAt)}` : null

  const pdf = usePreparedFile(signature && `pdf|${signature}`, async () => {
    const doc = buildReportDocument(data!, from, to, { settings: settings! })
    const bytes = await renderReportPdf(doc)
    return new File([bytes], `${doc.fileName}.pdf`, { type: 'application/pdf' })
  })

  const csv = useMemo(() => {
    if (!valid || !data) return null
    return new File([UTF8_BOM + buildCSV(data, from, to)], `${reportFileName(from, to)}.csv`, { type: 'text/csv' })
  }, [valid, data, from, to])

  const counts = useMemo(() => {
    if (!data || !valid) return null
    const symptoms = data.symptoms.filter((s) => s.type !== 'feci').length
    const days = dateRange(from, to).length
    return `${days} ${days === 1 ? 'giorno' : 'giorni'} · ${data.entries.length} ${data.entries.length === 1 ? 'voce' : 'voci'} · ${symptoms} ${symptoms === 1 ? 'sintomo' : 'sintomi'}`
  }, [data, valid, from, to])

  const options = presets(t, settings?.dietStartDate)
  const activePreset = options.find((p) => p.from === from && p.to === to)?.id

  return (
    <div className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="pb-2 text-sm font-medium">Periodo</legend>
        <div className="grid grid-cols-2 gap-2">
          {options.map((p, i) => (
            <Button
              key={p.id}
              type="button"
              variant={activePreset === p.id ? 'default' : 'outline'}
              aria-pressed={activePreset === p.id}
              className={cn(
                'h-auto min-h-11 py-2 whitespace-normal',
                options.length % 2 === 1 && i === options.length - 1 && 'col-span-2',
              )}
              onClick={() => setChosen({ from: p.from, to: p.to })}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="share-from">Dal</FieldLabel>
            <Input
              id="share-from"
              type="date"
              value={from}
              max={to}
              onChange={(e) => {
                const v = e.target.value
                if (v) setChosen({ from: v > t ? t : v, to })
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="share-to">Al</FieldLabel>
            <Input
              id="share-to"
              type="date"
              value={to}
              min={from}
              max={t}
              onChange={(e) => {
                // Safari non sempre applica max nel selettore: niente giorni futuri.
                const v = e.target.value
                if (v) setChosen({ from, to: v > t ? t : v })
              }}
            />
          </Field>
        </div>
        {valid ? (
          <p className="text-sm text-muted-foreground">
            <span className="block text-foreground">{capitalize(periodLabel(from, to))}</span>
            {counts && <span className="block text-xs">{counts}</span>}
          </p>
        ) : (
          <p className="text-sm text-destructive">La data di inizio è successiva a quella di fine.</p>
        )}
      </fieldset>

      <div className="space-y-2">
        <ShareButton
          prepared={pdf}
          label="Condividi PDF"
          preparingLabel="Preparo il PDF…"
          icon={<FileTextIcon />}
          className="h-12 w-full text-base"
          successMessage="PDF pronto"
          disabled={!valid}
        />
        <p className="px-1 text-xs text-muted-foreground">
          Il PDF contiene un riepilogo del periodo, i limiti del piano settimana per settimana e il diario giorno
          per giorno con sintomi, feci e integratori. Si apre su qualsiasi telefono o computer.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 pb-[env(safe-area-inset-bottom)]">
        <Button
          variant="outline"
          className="h-11"
          disabled={!valid}
          onClick={() => navigate(`/stampa?da=${from}&a=${to}`)}
        >
          <PrinterIcon /> Stampa
        </Button>
        <ShareButton
          prepared={csv ? { status: 'ready', file: csv } : { status: valid ? 'preparing' : 'idle' }}
          label="Excel (CSV)"
          preparingLabel="Excel (CSV)"
          icon={<FileSpreadsheetIcon />}
          variant="outline"
          className="h-11"
          successMessage="CSV pronto"
          disabled={!valid}
        />
      </div>
    </div>
  )
}

function ShareButton({
  prepared,
  label,
  preparingLabel,
  icon,
  variant = 'default',
  className,
  successMessage,
  disabled,
}: {
  prepared: PreparedFile
  label: string
  preparingLabel: string
  icon: React.ReactNode
  variant?: 'default' | 'outline'
  className?: string
  successMessage: string
  disabled?: boolean
}) {
  const busy = prepared.status === 'preparing'
  if (prepared.status === 'error') {
    return (
      <p className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
        Non sono riuscito a creare il file. Cambia periodo o riprova più tardi.
      </p>
    )
  }
  return (
    <Button
      variant={variant}
      className={className}
      disabled={disabled || prepared.status !== 'ready'}
      aria-busy={busy}
      onClick={async () => {
        if (prepared.status !== 'ready') return
        // Nessuna attesa prima di shareFile: su iPhone la condivisione deve partire dal tocco.
        const result = await shareFile(prepared.file)
        if (result === 'downloaded') toast.success(successMessage, { description: prepared.file.name })
      }}
    >
      {busy ? <Loader2Icon className="animate-spin" /> : icon}
      {busy ? preparingLabel : label}
    </Button>
  )
}
