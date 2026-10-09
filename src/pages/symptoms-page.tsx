import { useState } from 'react'
import { toast } from 'sonner'
import { DateNav } from '@/components/date-nav'
import { Page, SectionTitle } from '@/components/page'
import { SymptomDrawer } from '@/components/symptom-drawer'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useDayLog, useSymptoms } from '@/hooks/use-data'
import { useSelectedDate } from '@/hooks/selected-date'
import { symptomLabel } from '@/lib/report'
import { cn } from '@/lib/utils'
import { BRISTOL, SYMPTOMS } from '@/model/constants'
import type { ISODate, Symptom, SymptomType } from '@/model/types'
import { repo } from '@/repo'

export function SymptomsPage() {
  const { date, setDate } = useSelectedDate()
  const symptoms = useSymptoms(date)
  const dayLog = useDayLog(date)
  const [drawer, setDrawer] = useState<{ open: boolean; type: SymptomType; symptom?: Symptom }>({
    open: false,
    type: 'gonfiore',
  })

  const sorted = [...(symptoms ?? [])].sort((a, b) => a.time.localeCompare(b.time))
  const hasSymptoms = sorted.some((s) => s.type !== 'feci')

  return (
    <Page title="Sintomi" subtitle="Sintomi e feci, in qualsiasi momento">
      <DateNav date={date} onChange={setDate} />

      <Card size="sm">
        <CardContent>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block font-medium">Nessun sintomo oggi</span>
              <span className="block text-xs text-muted-foreground">
                {hasSymptoms ? 'Ci sono sintomi registrati in questa giornata.' : 'Registra una giornata tranquilla con un tocco.'}
              </span>
            </span>
            <Switch
              checked={!!dayLog?.noSymptoms}
              disabled={hasSymptoms}
              onCheckedChange={async (checked) => {
                await repo.dayLogs.update(date, { noSymptoms: checked })
                if (checked) toast.success('Segnato: nessun sintomo oggi')
              }}
              className="scale-125"
            />
          </label>
        </CardContent>
      </Card>

      <SectionTitle>Registra</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {SYMPTOMS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setDrawer({ open: true, type: s.id })}
            className={cn(
              'flex min-h-14 items-center justify-center rounded-xl border bg-card px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-muted active:bg-muted',
              s.id === 'feci' && 'col-span-2',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <SectionTitle>Registrati in questa giornata</SectionTitle>
      {sorted.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          {dayLog?.noSymptoms ? 'Nessun sintomo segnato.' : 'Ancora nulla.'}
        </p>
      ) : (
        <Card size="sm" className="py-1">
          <ul className="divide-y">
            {sorted.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setDrawer({ open: true, type: s.type, symptom: s })}
                  className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left hover:bg-muted"
                >
                  <span className="w-11 shrink-0 text-xs text-muted-foreground tabular-nums">{s.time}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{symptomLabel(s)}</span>
                    {s.type === 'feci' && s.bristol && (
                      <span className="block text-xs text-muted-foreground">
                        {BRISTOL[s.bristol - 1]?.label}
                      </span>
                    )}
                    {s.note && <span className="block truncate text-xs text-muted-foreground">{s.note}</span>}
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {s.type === 'feci' ? `Bristol ${s.bristol}` : `${s.intensity}/10`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <SectionTitle>Note della giornata</SectionTitle>
      {dayLog !== undefined && <DayNote key={date} date={date} initial={dayLog?.note ?? ''} />}

      <SymptomDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        date={date}
        type={drawer.type}
        symptom={drawer.symptom}
      />
    </Page>
  )
}

/** Note libere della giornata, salvate quando si esce dal campo. */
function DayNote({ date, initial }: { date: ISODate; initial: string }) {
  const [text, setText] = useState(initial)
  const [saved, setSaved] = useState(initial)

  return (
    <Textarea
      rows={3}
      placeholder="Es. stress, sonno, ciclo, attività fisica…"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const note = text.trim()
        if (note === saved) return
        setSaved(note)
        repo.dayLogs.update(date, { note: note || undefined })
      }}
    />
  )
}
