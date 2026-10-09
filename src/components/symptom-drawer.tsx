import { Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { nowTime, today } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { BRISTOL, SYMPTOM_LABEL, SYMPTOMS } from '@/model/constants'
import type { ISODate, Symptom, SymptomType } from '@/model/types'
import { repo } from '@/repo'
import { FormDrawer } from './form-drawer'

interface SymptomDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: ISODate
  type: SymptomType
  symptom?: Symptom
}

export function SymptomDrawer({ open, onOpenChange, date, type, symptom }: SymptomDrawerProps) {
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={symptom ? 'Modifica' : type === 'feci' ? 'Registra feci' : `Registra ${SYMPTOM_LABEL[type].toLowerCase()}`}
      className="max-h-[92dvh]"
    >
      <SymptomForm date={date} type={type} symptom={symptom} onClose={() => onOpenChange(false)} />
    </FormDrawer>
  )
}

function SymptomForm({
  date,
  type: initialType,
  symptom,
  onClose,
}: {
  date: ISODate
  type: SymptomType
  symptom?: Symptom
  onClose: () => void
}) {
  const [type, setType] = useState<SymptomType>(symptom?.type ?? initialType)
  const [time, setTime] = useState(symptom?.time ?? (date === today() ? nowTime() : '12:00'))
  const [intensity, setIntensity] = useState<number | undefined>(symptom?.intensity)
  const [bristol, setBristol] = useState<number | undefined>(symptom?.bristol)
  const [label, setLabel] = useState(symptom?.label ?? '')
  const [note, setNote] = useState(symptom?.note ?? '')
  const isStool = type === 'feci'

  async function save() {
    if (isStool && bristol == null) {
      toast.error('Scegli il tipo della scala di Bristol.')
      return
    }
    if (!isStool && intensity == null) {
      toast.error('Scegli l’intensità da 0 a 10.')
      return
    }
    await repo.symptoms.save({
      id: symptom?.id,
      createdAt: symptom?.createdAt,
      date: symptom?.date ?? date,
      time,
      type,
      intensity: isStool ? undefined : intensity,
      bristol: isStool ? bristol : undefined,
      label: type === 'altro' ? label.trim() || undefined : undefined,
      note: note.trim() || undefined,
    })
    toast.success(symptom ? 'Aggiornato' : 'Registrato')
    onClose()
  }

  async function remove() {
    if (!symptom) return
    await repo.symptoms.remove(symptom.id)
    toast.success('Eliminato')
    onClose()
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[1.4fr_1fr] gap-3">
        <Field>
          <FieldLabel htmlFor="symptom-type">Tipo</FieldLabel>
          <NativeSelect
            id="symptom-type"
            className="w-full"
            value={type}
            onChange={(e) => setType(e.target.value as SymptomType)}
          >
            {SYMPTOMS.map((s) => (
              <NativeSelectOption key={s.id} value={s.id}>
                {s.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="symptom-time">Orario</FieldLabel>
          <Input id="symptom-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>

      {type === 'altro' && (
        <Field>
          <FieldLabel htmlFor="symptom-label">Quale sintomo?</FieldLabel>
          <Input
            id="symptom-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Es. mal di testa"
          />
        </Field>
      )}

      {isStool ? (
        <fieldset className="space-y-2">
          <legend className="pb-2 text-sm font-medium">Scala di Bristol</legend>
          {BRISTOL.map((b) => (
            <button
              key={b.type}
              type="button"
              aria-pressed={bristol === b.type}
              onClick={() => setBristol(b.type)}
              className={cn(
                'flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                bristol === b.type ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted',
              )}
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border font-semibold tabular-nums',
                  bristol === b.type && 'border-primary bg-primary text-primary-foreground',
                )}
              >
                {b.type}
              </span>
              <span>{b.label}</span>
            </button>
          ))}
        </fieldset>
      ) : (
        <fieldset>
          <legend className="pb-2 text-sm font-medium">
            Intensità{' '}
            {intensity != null && <span className="text-muted-foreground">— {intensity}/10</span>}
          </legend>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 11 }, (_, i) => (
              <Button
                key={i}
                type="button"
                variant={intensity === i ? 'default' : 'outline'}
                aria-pressed={intensity === i}
                className="h-11 text-base tabular-nums"
                onClick={() => setIntensity(i)}
              >
                {i}
              </Button>
            ))}
          </div>
          <div className="flex justify-between px-1 pt-1.5 text-xs text-muted-foreground">
            <span>0 = assente</span>
            <span>10 = massima</span>
          </div>
        </fieldset>
      )}

      <Field>
        <FieldLabel htmlFor="symptom-note">Note</FieldLabel>
        <Textarea id="symptom-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
        <Button className="h-11 text-base" onClick={save}>
          {symptom ? 'Salva modifiche' : 'Salva'}
        </Button>
        {symptom && (
          <Button variant="ghost" className="h-11 text-destructive" onClick={remove}>
            <Trash2Icon /> Elimina
          </Button>
        )}
      </div>
    </div>
  )
}
