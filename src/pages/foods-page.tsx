import { PlusIcon, SearchIcon, StarIcon, Trash2Icon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FormDrawer } from '@/components/form-drawer'
import { Page, SectionTitle } from '@/components/page'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useFoods } from '@/hooks/use-data'
import { searchFoods, sortByName } from '@/lib/foods'
import { formatPortion, parseQuantity, quantityText } from '@/lib/units'
import { cn } from '@/lib/utils'
import { CATEGORY_LABEL, STATUS_LABEL, UNITS } from '@/model/constants'
import type { Food, FoodCategory, FoodStatus, FoodTag, Unit } from '@/model/types'
import { repo } from '@/repo'

const TAG_OPTIONS: { tag: FoodTag; label: string }[] = [
  { tag: 'frutto', label: 'Frutto (1 per spuntino)' },
  { tag: 'uovo', label: 'Uova (limite settimanale)' },
  { tag: 'olio-evo', label: 'Olio EVO (limite giornaliero)' },
  { tag: 'latticino-delattosato', label: 'Latticino delattosato (limite settimanale)' },
  { tag: 'agrumi', label: 'Fase acuta: agrumi' },
  { tag: 'cioccolato', label: 'Fase acuta: cioccolato' },
  { tag: 'te', label: 'Fase acuta: tè non deteinato' },
  { tag: 'caffe', label: 'Fase acuta: caffè non decaffeinato' },
  { tag: 'menta', label: 'Fase acuta: menta' },
  { tag: 'succo-frutta', label: 'Fase acuta: succhi di frutta' },
]

export function FoodsPage() {
  const foods = useFoods()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<FoodStatus | ''>('')
  const [onlyMine, setOnlyMine] = useState(false)
  const [drawer, setDrawer] = useState<{ open: boolean; food?: Food }>({ open: false })

  const groups = useMemo(() => {
    let list = foods ?? []
    if (status) list = list.filter((f) => f.status === status)
    if (onlyMine) list = list.filter((f) => f.custom || f.favorite)
    if (query.trim()) return [{ category: null, foods: searchFoods(list, query, 200) }]
    return (Object.keys(CATEGORY_LABEL) as FoodCategory[])
      .map((category) => ({ category, foods: sortByName(list.filter((f) => f.category === category)) }))
      .filter((g) => g.foods.length)
  }, [foods, query, status, onlyMine])

  return (
    <Page
      title="Alimenti"
      subtitle={foods ? `${foods.length} alimenti` : undefined}
      back="/altro"
      actions={
        <Button size="icon" className="size-11" onClick={() => setDrawer({ open: true })} aria-label="Nuovo alimento">
          <PlusIcon className="size-5" />
        </Button>
      }
    >
      <div className="space-y-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cerca"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Cerca alimento"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NativeSelect
            className="w-full"
            aria-label="Filtra per stato"
            value={status}
            onChange={(e) => setStatus(e.target.value as FoodStatus | '')}
          >
            <NativeSelectOption value="">Tutti gli stati</NativeSelectOption>
            {Object.entries(STATUS_LABEL).map(([id, label]) => (
              <NativeSelectOption key={id} value={id}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            variant={onlyMine ? 'default' : 'outline'}
            aria-pressed={onlyMine}
            className="h-11"
            onClick={() => setOnlyMine((v) => !v)}
          >
            Miei e preferiti
          </Button>
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.category ?? 'risultati'} className="space-y-2">
          {g.category && <SectionTitle>{CATEGORY_LABEL[g.category]}</SectionTitle>}
          <Card size="sm" className="py-1">
            <ul className="divide-y">
              {g.foods.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setDrawer({ open: true, food: f })}
                    className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug">
                        {f.name}
                        {f.favorite && <StarIcon className="ml-1 inline size-3.5 fill-amber-400 text-amber-500" />}
                      </span>
                      {(f.maxPortion || f.custom) && (
                        <span className="block text-xs text-muted-foreground">
                          {[f.maxPortion && `max ${formatPortion(f.maxPortion)}`, f.custom && 'personale']
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                    </span>
                    <StatusBadge status={f.status} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
      {foods && groups.length === 0 && <p className="px-1 text-sm text-muted-foreground">Nessun alimento trovato.</p>}

      <FormDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        title={drawer.food ? 'Modifica alimento' : 'Nuovo alimento'}
        className="h-[92dvh]"
      >
        <FoodForm food={drawer.food} initialName={query} onClose={() => setDrawer((d) => ({ ...d, open: false }))} />
      </FormDrawer>
    </Page>
  )
}

function FoodForm({ food, initialName, onClose }: { food?: Food; initialName: string; onClose: () => void }) {
  const [name, setName] = useState(food?.name ?? initialName.trim())
  const [category, setCategory] = useState<FoodCategory>(food?.category ?? 'altro')
  const [status, setStatus] = useState<FoodStatus>(food?.status ?? 'verificare')
  const [maxAmount, setMaxAmount] = useState(quantityText(food?.maxPortion?.amount))
  const [maxUnit, setMaxUnit] = useState<Unit>(food?.maxPortion?.unit ?? 'g')
  const [note, setNote] = useState(food?.note ?? '')
  const [tags, setTags] = useState<FoodTag[]>(food?.tags ?? [])
  const [favorite, setFavorite] = useState(!!food?.favorite)

  async function save() {
    if (!name.trim()) {
      toast.error('Scrivi il nome.')
      return
    }
    const amount = parseQuantity(maxAmount)
    await repo.foods.save({
      ...food,
      id: food?.id,
      name: name.trim(),
      category,
      status,
      maxPortion: amount ? { amount, unit: maxUnit } : undefined,
      note: note.trim() || undefined,
      tags: tags.length ? tags : undefined,
      favorite,
      custom: food ? food.custom : true,
    })
    toast.success(food ? 'Alimento aggiornato' : 'Alimento aggiunto')
    onClose()
  }

  async function remove() {
    if (!food) return
    await repo.foods.remove(food.id)
    toast.success('Alimento eliminato')
    onClose()
  }

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="food-name">Nome</FieldLabel>
        <Input id="food-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="food-status">Stato</FieldLabel>
          <NativeSelect id="food-status" className="w-full" value={status} onChange={(e) => setStatus(e.target.value as FoodStatus)}>
            {Object.entries(STATUS_LABEL).map(([id, label]) => (
              <NativeSelectOption key={id} value={id}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="food-category">Categoria</FieldLabel>
          <NativeSelect
            id="food-category"
            className="w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value as FoodCategory)}
          >
            {Object.entries(CATEGORY_LABEL).map(([id, label]) => (
              <NativeSelectOption key={id} value={id}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="food-max">Porzione massima</FieldLabel>
          <Input
            id="food-max"
            inputMode="decimal"
            placeholder="Nessuna"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="food-unit">Unità</FieldLabel>
          <NativeSelect id="food-unit" className="w-full" value={maxUnit} onChange={(e) => setMaxUnit(e.target.value as Unit)}>
            {UNITS.map((u) => (
              <NativeSelectOption key={u.id} value={u.id}>
                {u.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="food-note">Note</FieldLabel>
        <Textarea id="food-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <label className="flex min-h-11 items-center gap-3 text-sm">
        <Checkbox checked={favorite} onCheckedChange={setFavorite} className="size-5" />
        Preferito
      </label>

      <fieldset className="space-y-1">
        <legend className="pb-1 text-sm font-medium">Contatori e fase acuta</legend>
        <FieldDescription className="pb-1">Collega l’alimento ai limiti del piano.</FieldDescription>
        {TAG_OPTIONS.map(({ tag, label }) => (
          <label key={tag} className="flex min-h-10 items-center gap-3 text-sm">
            <Checkbox
              checked={tags.includes(tag)}
              onCheckedChange={(checked) => setTags((t) => (checked ? [...t, tag] : t.filter((x) => x !== tag)))}
              className="size-5"
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className={cn('flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]')}>
        <Button className="h-11 text-base" onClick={save}>
          Salva
        </Button>
        {food && (
          <Button variant="ghost" className="h-11 text-destructive" onClick={remove}>
            <Trash2Icon /> Elimina alimento
          </Button>
        )}
      </div>
      {food && !food.custom && (
        <p className="text-xs text-muted-foreground">
          Alimento del piano: le voci già registrate restano nel diario anche se lo elimini.
        </p>
      )}
    </div>
  )
}
