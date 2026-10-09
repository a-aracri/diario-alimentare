import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormDrawer } from '@/components/form-drawer'
import { Page } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useSettings, useSupplements } from '@/hooks/use-data'
import { addDays, formatFull, today } from '@/lib/dates'
import { supplementStatus } from '@/lib/supplements'
import type { Supplement, SupplementMode } from '@/model/types'
import { repo } from '@/repo'

const STATE_LABEL = {
  giornaliero: 'Ogni giorno',
  'al-bisogno': 'Al bisogno',
  concluso: 'Concluso',
  'non-iniziato': 'Non ancora iniziato',
}

export function SupplementsPage() {
  const supplements = useSupplements()
  const [drawer, setDrawer] = useState<{ open: boolean; supplement?: Supplement }>({ open: false })
  const t = today()

  return (
    <Page
      title="Integratori"
      back="/altro"
      actions={
        <Button size="icon" className="size-11" onClick={() => setDrawer({ open: true })} aria-label="Nuovo integratore">
          <PlusIcon className="size-5" />
        </Button>
      }
    >
      <p className="px-1 text-sm text-muted-foreground">
        La checklist di ogni giorno è nel Diario. Qui puoi cambiare inizio, durata e orario del promemoria.
      </p>
      <Card size="sm" className="py-1">
        <ul className="divide-y">
          {supplements?.map((s) => {
            const status = supplementStatus(s, t)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setDrawer({ open: true, supplement: s })}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {s.timing}
                      {s.mode === 'giornaliero' && s.startDate && ` · dal ${formatFull(s.startDate)}`}
                      {s.mode === 'giornaliero' && s.durationDays
                        ? ` per ${s.durationDays} giorni, poi ${s.afterDuration === 'al-bisogno' ? 'al bisogno' : 'stop'}`
                        : ''}
                    </span>
                  </span>
                  <Badge variant="secondary">{STATE_LABEL[status.state]}</Badge>
                </button>
              </li>
            )
          })}
        </ul>
      </Card>

      <FormDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        title={drawer.supplement ? 'Modifica integratore' : 'Nuovo integratore'}
        className="max-h-[92dvh]"
      >
        <SupplementForm supplement={drawer.supplement} onClose={() => setDrawer((d) => ({ ...d, open: false }))} />
      </FormDrawer>
    </Page>
  )
}

function SupplementForm({ supplement, onClose }: { supplement?: Supplement; onClose: () => void }) {
  const settings = useSettings()
  const [name, setName] = useState(supplement?.name ?? '')
  const [timing, setTiming] = useState(supplement?.timing ?? '')
  const [mode, setMode] = useState<SupplementMode>(supplement?.mode ?? 'giornaliero')
  const [startDate, setStartDate] = useState(supplement?.startDate ?? settings?.dietStartDate ?? today())
  const [duration, setDuration] = useState(supplement?.durationDays?.toString() ?? '')
  const [after, setAfter] = useState(supplement?.afterDuration ?? 'stop')
  const [reminder, setReminder] = useState(supplement?.reminderTime ?? '')
  const [note, setNote] = useState(supplement?.note ?? '')

  const days = Number.parseInt(duration, 10)
  const durationDays = Number.isFinite(days) && days > 0 ? days : undefined

  async function save() {
    if (!name.trim()) {
      toast.error('Scrivi il nome.')
      return
    }
    await repo.supplements.save({
      id: supplement?.id,
      name: name.trim(),
      timing: timing.trim(),
      mode,
      startDate: mode === 'giornaliero' ? startDate : undefined,
      durationDays: mode === 'giornaliero' ? durationDays : undefined,
      afterDuration: mode === 'giornaliero' && durationDays ? after : undefined,
      reminderTime: mode === 'giornaliero' && reminder ? reminder : undefined,
      note: note.trim() || undefined,
      order: supplement?.order ?? Date.now(),
    })
    toast.success('Salvato')
    onClose()
  }

  async function remove() {
    if (!supplement) return
    await repo.supplements.remove(supplement.id)
    toast.success('Integratore eliminato')
    onClose()
  }

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="supp-name">Nome</FieldLabel>
        <Input id="supp-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="supp-timing">Quando</FieldLabel>
        <Input id="supp-timing" value={timing} placeholder="Es. dopo cena" onChange={(e) => setTiming(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="supp-mode">Frequenza</FieldLabel>
        <NativeSelect id="supp-mode" className="w-full" value={mode} onChange={(e) => setMode(e.target.value as SupplementMode)}>
          <NativeSelectOption value="giornaliero">Ogni giorno</NativeSelectOption>
          <NativeSelectOption value="al-bisogno">Al bisogno</NativeSelectOption>
        </NativeSelect>
      </Field>
      {mode === 'giornaliero' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="supp-start">Dal</FieldLabel>
              <Input id="supp-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="supp-duration">Durata (giorni)</FieldLabel>
              <Input
                id="supp-duration"
                inputMode="numeric"
                placeholder="Senza fine"
                value={duration}
                onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))}
              />
            </Field>
          </div>
          {durationDays && (
            <Field>
              <FieldLabel htmlFor="supp-after">Al termine</FieldLabel>
              <NativeSelect
                id="supp-after"
                className="w-full"
                value={after}
                onChange={(e) => setAfter(e.target.value as 'stop' | 'al-bisogno')}
              >
                <NativeSelectOption value="stop">Concludi</NativeSelectOption>
                <NativeSelectOption value="al-bisogno">Passa ad al bisogno</NativeSelectOption>
              </NativeSelect>
              <FieldDescription>Ultimo giorno: {formatFull(addDays(startDate, durationDays - 1))}</FieldDescription>
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="supp-reminder">Promemoria dopo le</FieldLabel>
            <Input id="supp-reminder" type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} />
            <FieldDescription>Dopo quest’ora, se non è spuntato, il Diario lo evidenzia.</FieldDescription>
          </Field>
        </>
      )}
      <Field>
        <FieldLabel htmlFor="supp-note">Note</FieldLabel>
        <Textarea id="supp-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
        <Button className="h-11 text-base" onClick={save}>
          Salva
        </Button>
        {supplement && (
          <Button variant="ghost" className="h-11 text-destructive" onClick={remove}>
            <Trash2Icon /> Elimina
          </Button>
        )}
      </div>
    </div>
  )
}
