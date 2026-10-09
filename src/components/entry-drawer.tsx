import { ArrowLeftRightIcon, Trash2Icon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import {
  useFoodIndex,
  useFoods,
  useRecentFoodIds,
  useSettings,
  useWeekEntries,
} from '@/hooks/use-data'
import { nowTime, today } from '@/lib/dates'
import { formatPortion, parseQuantity, quantityText } from '@/lib/units'
import { evaluateEntry } from '@/lib/warnings'
import { CATEGORY_LABEL, MEAL_LABEL, MEALS, STATUS_LABEL, UNITS } from '@/model/constants'
import type { Entry, Food, FoodCategory, FoodStatus, ISODate, MealId, Unit } from '@/model/types'
import { repo } from '@/repo'
import { FoodPicker } from './food-picker'
import { FormDrawer } from './form-drawer'
import { AcuteBadge, StatusBadge } from './status-badge'
import { WarningList } from './warning-list'

interface EntryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: ISODate
  meal: MealId
  /** Voce da modificare; assente per un nuovo inserimento. */
  entry?: Entry
}

export function EntryDrawer({ open, onOpenChange, date, meal, entry }: EntryDrawerProps) {
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? 'Modifica voce' : `Aggiungi a ${MEAL_LABEL[meal]}`}
      className="h-[92dvh]"
      bodyClassName="flex flex-col overflow-hidden p-0"
    >
      <EntryEditor date={date} meal={meal} entry={entry} onClose={() => onOpenChange(false)} />
    </FormDrawer>
  )
}

interface FormState {
  date: ISODate
  meal: MealId
  time: string
  foodId?: string
  name: string
  quantity: string
  unit: Unit
  note: string
  saveAsFood: boolean
  newStatus: FoodStatus
  newCategory: FoodCategory
}

function defaultTime(date: ISODate, meal: MealId) {
  return date === today() ? nowTime() : MEALS.find((m) => m.id === meal)!.defaultTime
}

function defaultUnit(food: Food): Unit {
  if (food.maxPortion) return food.maxPortion.unit
  if (food.category === 'piatti') return 'porzioni'
  if (food.category === 'bevande') return 'ml'
  if (food.tags?.includes('uovo')) return 'pezzi'
  if (food.tags?.includes('olio-evo')) return 'cucchiai'
  return 'g'
}

function EntryEditor({
  date,
  meal,
  entry,
  onClose,
}: {
  date: ISODate
  meal: MealId
  entry?: Entry
  onClose: () => void
}) {
  const [step, setStep] = useState<'pick' | 'form'>(entry ? 'form' : 'pick')
  const foods = useFoods()
  const index = useFoodIndex()
  const settings = useSettings()
  const recentIds = useRecentFoodIds()
  const [form, setForm] = useState<FormState>(() => ({
    date: entry?.date ?? date,
    meal: entry?.meal ?? meal,
    time: entry?.time ?? defaultTime(date, meal),
    foodId: entry?.foodId,
    name: entry?.name ?? '',
    quantity: quantityText(entry?.quantity),
    unit: entry?.unit ?? 'g',
    note: entry?.note ?? '',
    saveAsFood: false,
    newStatus: 'verificare',
    newCategory: 'altro',
  }))
  const weekEntries = useWeekEntries(form.date)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const food = form.foodId ? index?.byId.get(form.foodId) : undefined
  const quantity = parseQuantity(form.quantity)

  const warnings = useMemo(() => {
    if (!index || !settings || !weekEntries || !form.name.trim()) return []
    return evaluateEntry({
      draft: {
        id: entry?.id,
        date: form.date,
        meal: form.meal,
        foodId: form.foodId,
        name: form.name,
        quantity,
        unit: quantity != null ? form.unit : undefined,
      },
      food,
      weekEntries,
      index,
      limits: settings.limits,
      acuteMode: settings.acuteMode,
    })
  }, [index, settings, weekEntries, form, quantity, food, entry?.id])

  async function pickFood(f: Food) {
    const last = await repo.entries.lastUse(f.id)
    setForm((s) => ({
      ...s,
      foodId: f.id,
      name: f.name,
      quantity: last?.quantity != null ? quantityText(last.quantity) : f.category === 'piatti' ? '1' : '',
      unit: last?.unit ?? defaultUnit(f),
      saveAsFood: false,
    }))
    setStep('form')
  }

  function freeText(name: string) {
    setForm((s) => ({ ...s, foodId: undefined, name, quantity: '', unit: 'g' }))
    setStep('form')
  }

  async function save(addAnother: boolean) {
    const name = form.name.trim()
    if (!name) {
      toast.error('Scrivi il nome dell’alimento.')
      return
    }
    let foodId = form.foodId
    if (!foodId && form.saveAsFood) {
      const created = await repo.foods.save({
        name,
        category: form.newCategory,
        status: form.newStatus,
        custom: true,
      })
      foodId = created.id
    }
    await repo.entries.save({
      id: entry?.id,
      createdAt: entry?.createdAt,
      date: form.date,
      meal: form.meal,
      time: form.time || defaultTime(form.date, form.meal),
      foodId,
      name,
      quantity,
      unit: quantity != null ? form.unit : undefined,
      note: form.note.trim() || undefined,
    })
    const warning = warnings.find((w) => w.level === 'warning')
    if (warning) toast.warning('Voce salvata', { description: warning.message })
    else toast.success(entry ? 'Voce aggiornata' : `Aggiunto a ${MEAL_LABEL[form.meal]}`)

    if (addAnother) {
      setForm((s) => ({ ...s, foodId: undefined, name: '', quantity: '', note: '', saveAsFood: false }))
      setStep('pick')
    } else {
      onClose()
    }
  }

  async function remove() {
    if (!entry) return
    await repo.entries.remove(entry.id)
    toast.success('Voce eliminata')
    onClose()
  }

  if (step === 'pick') {
    if (!foods || !recentIds || !settings) return null
    return (
      <FoodPicker
        foods={foods}
        recentIds={recentIds}
        acuteMode={settings.acuteMode}
        onPick={pickFood}
        onFreeText={freeText}
      />
    )
  }

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
      {food ? (
        <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="leading-snug font-medium">{food.name}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={food.status} />
              <AcuteBadge food={food} acuteMode={settings?.acuteMode} />
              {food.maxPortion && (
                <span className="text-xs text-muted-foreground">
                  max {formatPortion(food.maxPortion)}
                </span>
              )}
            </div>
            {food.note && <p className="text-xs text-muted-foreground">{food.note}</p>}
          </div>
          <Button variant="outline" className="h-11 shrink-0" onClick={() => setStep('pick')}>
            <ArrowLeftRightIcon /> Cambia
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Field>
            <FieldLabel htmlFor="entry-name">Alimento o bevanda</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="entry-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Nome"
              />
              <Button variant="outline" className="h-11 shrink-0" onClick={() => setStep('pick')}>
                Cerca
              </Button>
            </div>
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <Checkbox
              checked={form.saveAsFood}
              onCheckedChange={(checked) => set('saveAsFood', checked)}
            />
            Salva anche tra i miei alimenti
          </label>
          {form.saveAsFood && (
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="entry-new-status">Stato</FieldLabel>
                <NativeSelect
                  id="entry-new-status"
                  className="w-full"
                  value={form.newStatus}
                  onChange={(e) => set('newStatus', e.target.value as FoodStatus)}
                >
                  {Object.entries(STATUS_LABEL).map(([id, label]) => (
                    <NativeSelectOption key={id} value={id}>
                      {label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="entry-new-category">Categoria</FieldLabel>
                <NativeSelect
                  id="entry-new-category"
                  className="w-full"
                  value={form.newCategory}
                  onChange={(e) => set('newCategory', e.target.value as FoodCategory)}
                >
                  {Object.entries(CATEGORY_LABEL).map(([id, label]) => (
                    <NativeSelectOption key={id} value={id}>
                      {label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <Field>
          <FieldLabel htmlFor="entry-quantity">Quantità</FieldLabel>
          <Input
            id="entry-quantity"
            inputMode="decimal"
            placeholder="—"
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="entry-unit">Unità</FieldLabel>
          <NativeSelect
            id="entry-unit"
            className="w-full"
            value={form.unit}
            onChange={(e) => set('unit', e.target.value as Unit)}
          >
            {UNITS.map((u) => (
              <NativeSelectOption key={u.id} value={u.id}>
                {u.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      {food?.maxPortion && (
        <Button
          variant="secondary"
          className="h-10"
          onClick={() =>
            setForm((s) => ({
              ...s,
              quantity: quantityText(food.maxPortion!.amount),
              unit: food.maxPortion!.unit,
            }))
          }
        >
          Usa la porzione indicata ({formatPortion(food.maxPortion)})
        </Button>
      )}

      <div className="grid grid-cols-[1.4fr_1fr] gap-3">
        <Field>
          <FieldLabel htmlFor="entry-meal">Pasto</FieldLabel>
          <NativeSelect
            id="entry-meal"
            className="w-full"
            value={form.meal}
            onChange={(e) => set('meal', e.target.value as MealId)}
          >
            {MEALS.map((m) => (
              <NativeSelectOption key={m.id} value={m.id}>
                {m.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="entry-time">Orario</FieldLabel>
          <Input
            id="entry-time"
            type="time"
            value={form.time}
            onChange={(e) => set('time', e.target.value)}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="entry-note">Note</FieldLabel>
        <Textarea
          id="entry-note"
          rows={2}
          placeholder="Es. come era cucinato, dove…"
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
        />
      </Field>

      <WarningList warnings={warnings} />

      <div className="flex flex-col gap-2 pt-1 pb-[env(safe-area-inset-bottom)]">
        <Button className="h-11 text-base" onClick={() => save(false)}>
          {entry ? 'Salva modifiche' : 'Salva'}
        </Button>
        {!entry && (
          <Button variant="outline" className="h-11" onClick={() => save(true)}>
            Salva e aggiungi un altro
          </Button>
        )}
        {entry && (
          <Button variant="ghost" className="h-11 text-destructive" onClick={remove}>
            <Trash2Icon /> Elimina voce
          </Button>
        )}
      </div>
    </div>
  )
}
