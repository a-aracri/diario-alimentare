import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { SUGGESTION_MEALS, type Suggestion, type SuggestionChoice } from '@/data/piano'
import { useFoodIndex, useFoods, useSettings, useWeekEntries } from '@/hooks/use-data'
import { navigate } from '@/hooks/use-route'
import { formatShort, nowTime, today } from '@/lib/dates'
import { sortByName } from '@/lib/foods'
import { formatQuantity } from '@/lib/units'
import { evaluateEntry, type EntryWarning } from '@/lib/warnings'
import { cn } from '@/lib/utils'
import { MEAL_LABEL, MEALS } from '@/model/constants'
import type { Entry, Food, ISODate, MealId } from '@/model/types'
import { repo, type EntryInput } from '@/repo'
import { FormDrawer } from './form-drawer'
import { WarningList } from './warning-list'

interface SuggestionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suggestion?: Suggestion
  date: ISODate
}

export function SuggestionDrawer({ open, onOpenChange, suggestion, date }: SuggestionDrawerProps) {
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={suggestion?.title ?? ''}
      description={`Aggiungi al diario di ${formatShort(date)}`}
      className="max-h-[92dvh]"
    >
      {suggestion && (
        <SuggestionForm suggestion={suggestion} date={date} onClose={() => onOpenChange(false)} />
      )}
    </FormDrawer>
  )
}

function defaultMeal(s: Suggestion, date: ISODate): MealId {
  const options = SUGGESTION_MEALS[s.kind]
  if (options.length === 1) return options[0]
  const late = date === today() && nowTime() >= (s.kind === 'spuntino' ? '14:00' : '17:00')
  return late ? options[1] : options[0]
}

function SuggestionForm({
  suggestion,
  date,
  onClose,
}: {
  suggestion: Suggestion
  date: ISODate
  onClose: () => void
}) {
  const foods = useFoods()
  const index = useFoodIndex()
  const settings = useSettings()
  const weekEntries = useWeekEntries(date)
  const [meal, setMeal] = useState<MealId>(() => defaultMeal(suggestion, date))
  const [time, setTime] = useState(() =>
    date === today() ? nowTime() : MEALS.find((m) => m.id === defaultMeal(suggestion, date))!.defaultTime,
  )
  const [selection, setSelection] = useState(() =>
    suggestion.items.map((item) => ({ checked: !item.optional, choice: 0 })),
  )

  // Alternative per ogni voce: quelle del piano o, per "frutta", tutti i frutti consentiti.
  const choices = useMemo(
    () =>
      suggestion.items.map((item): SuggestionChoice[] =>
        item.fromTag
          ? sortByName(
              (foods ?? []).filter(
                (f) => f.tags?.includes(item.fromTag!) && (f.status === 'permesso' || f.status === 'limite'),
              ),
            ).map((f) => ({ foodId: f.id, quantity: f.maxPortion?.amount, unit: f.maxPortion?.unit }))
          : item.choices,
      ),
    [suggestion, foods],
  )

  const drafts = useMemo(() => {
    const out: (EntryInput & { food?: Food })[] = []
    suggestion.items.forEach((_, i) => {
      const sel = selection[i]
      const choice = choices[i][sel.choice]
      if (!sel.checked || !choice) return
      const food = index?.byId.get(choice.foodId)
      out.push({
        date,
        meal,
        time,
        foodId: choice.foodId,
        name: food?.name ?? choice.foodId,
        quantity: choice.quantity,
        unit: choice.unit,
        food,
      })
    })
    return out
  }, [suggestion, selection, choices, index, date, meal, time])

  // Avvisi calcolati in sequenza: ogni voce tiene conto di quelle precedenti.
  const warnings = useMemo(() => {
    if (!index || !settings || !weekEntries) return []
    const added: Entry[] = []
    const out: EntryWarning[] = []
    drafts.forEach(({ food, ...draft }, i) => {
      const ws = evaluateEntry({
        draft,
        food,
        weekEntries: [...weekEntries, ...added],
        index,
        limits: settings.limits,
        acuteMode: settings.acuteMode,
      })
      out.push(...ws.map((w) => ({ ...w, code: `${w.code}-${i}` as EntryWarning['code'] })))
      added.push({ ...draft, id: `draft-${i}`, createdAt: '', updatedAt: '' })
    })
    return out
  }, [drafts, index, settings, weekEntries])

  async function add() {
    if (!drafts.length) {
      toast.error('Seleziona almeno una voce.')
      return
    }
    await repo.entries.saveMany(drafts.map(({ food: _food, ...d }) => d))
    toast.success(`${drafts.length === 1 ? 'Aggiunta 1 voce' : `Aggiunte ${drafts.length} voci`} a ${MEAL_LABEL[meal]}`, {
      action: { label: 'Vai al diario', onClick: () => navigate('/') },
    })
    onClose()
  }

  const mealOptions = [...new Set([...SUGGESTION_MEALS[suggestion.kind], ...MEALS.map((m) => m.id)])]

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {suggestion.items.map((item, i) => {
          const sel = selection[i]
          const opts = choices[i]
          const update = (patch: Partial<typeof sel>) =>
            setSelection((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)))
          const label = (c: SuggestionChoice) => {
            const name = index?.byId.get(c.foodId)?.name ?? c.foodId
            const q = formatQuantity(c.quantity, c.unit)
            return q ? `${name} · ${q}` : name
          }
          return (
            <div key={i} className={cn('rounded-lg border p-3', !sel.checked && 'opacity-60')}>
              <label className="flex min-h-9 items-center gap-3">
                <Checkbox checked={sel.checked} onCheckedChange={(checked) => update({ checked })} className="size-5" />
                <span className="text-sm font-medium">
                  {opts.length === 1 ? label(opts[0]) : item.fromTag ? 'Frutto a scelta' : 'Una a scelta'}
                  {item.optional && <span className="font-normal text-muted-foreground"> (facoltativo)</span>}
                </span>
              </label>
              {opts.length > 4 ? (
                <NativeSelect
                  className="mt-2 w-full"
                  aria-label="Scegli"
                  value={String(sel.choice)}
                  onChange={(e) => update({ choice: Number(e.target.value), checked: true })}
                >
                  {opts.map((c, j) => (
                    <NativeSelectOption key={c.foodId} value={j}>
                      {label(c)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : (
                opts.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {opts.map((c, j) => (
                      <Button
                        key={c.foodId}
                        type="button"
                        variant={sel.choice === j ? 'default' : 'outline'}
                        aria-pressed={sel.choice === j}
                        className="h-auto min-h-10 py-2 whitespace-normal"
                        onClick={() => update({ choice: j, checked: true })}
                      >
                        {label(c)}
                      </Button>
                    ))}
                  </div>
                )
              )}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-3">
        <Field>
          <FieldLabel htmlFor="sugg-meal">Pasto</FieldLabel>
          <NativeSelect
            id="sugg-meal"
            className="w-full"
            value={meal}
            onChange={(e) => setMeal(e.target.value as MealId)}
          >
            {mealOptions.map((m) => (
              <NativeSelectOption key={m} value={m}>
                {MEAL_LABEL[m]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="sugg-time">Orario</FieldLabel>
          <Input id="sugg-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>

      <WarningList warnings={warnings} />

      <Button className="h-11 w-full text-base" onClick={add}>
        Aggiungi {drafts.length > 1 ? `${drafts.length} voci` : ''} al diario
      </Button>
    </div>
  )
}
