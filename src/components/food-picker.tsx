import { ChevronRightIcon, PencilLineIcon, SearchIcon, StarIcon, XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { searchFoods, sortByName } from '@/lib/foods'
import { formatPortion } from '@/lib/units'
import { cn } from '@/lib/utils'
import { CATEGORY_LABEL } from '@/model/constants'
import type { Food, FoodCategory } from '@/model/types'
import { repo } from '@/repo'
import { AcuteBadge, StatusBadge } from './status-badge'

interface FoodPickerProps {
  foods: Food[]
  recentIds: string[]
  acuteMode: boolean
  onPick: (food: Food) => void
  onFreeText: (name: string) => void
}

/** Ricerca nel database alimenti con preferiti, recenti e categorie. */
export function FoodPicker({ foods, recentIds, acuteMode, onPick, onFreeText }: FoodPickerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FoodCategory | null>(null)

  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods])
  const results = useMemo(() => searchFoods(foods, query), [foods, query])
  const favorites = useMemo(() => sortByName(foods.filter((f) => f.favorite)), [foods])
  const recents = useMemo(
    () =>
      recentIds
        .map((id) => byId.get(id))
        .filter((f): f is Food => !!f && !f.favorite)
        .slice(0, 8),
    [recentIds, byId],
  )
  const categories = useMemo(() => {
    const counts = new Map<FoodCategory, number>()
    for (const f of foods) counts.set(f.category, (counts.get(f.category) ?? 0) + 1)
    return (Object.keys(CATEGORY_LABEL) as FoodCategory[]).filter((c) => counts.get(c))
  }, [foods])
  const inCategory = useMemo(
    () => (category ? sortByName(foods.filter((f) => f.category === category)) : []),
    [foods, category],
  )

  const row = (food: Food) => (
    <FoodRow key={food.id} food={food} acuteMode={acuteMode} onPick={() => onPick(food)} />
  )
  const trimmed = query.trim()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative px-4 py-3">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          placeholder="Cerca alimento o bevanda"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setCategory(null)
          }}
          className="h-11 pr-10 pl-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-4 size-11"
            onClick={() => setQuery('')}
            aria-label="Cancella ricerca"
          >
            <XIcon />
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {trimmed ? (
          <div className="space-y-1">
            {results.map(row)}
            <button
              type="button"
              onClick={() => onFreeText(trimmed)}
              className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-dashed px-3 text-left text-sm hover:bg-muted"
            >
              <PencilLineIcon className="size-4 shrink-0 text-muted-foreground" />
              <span>
                Usa «<strong>{trimmed}</strong>» come testo libero
              </span>
            </button>
            {!results.length && (
              <p className="px-1 pt-2 text-sm text-muted-foreground">
                Nessun alimento trovato nel database. Puoi registrarlo come testo libero e, se vuoi,
                salvarlo tra i tuoi alimenti.
              </p>
            )}
          </div>
        ) : category ? (
          <div className="space-y-1">
            <Button variant="ghost" className="h-11 px-2" onClick={() => setCategory(null)}>
              ‹ Categorie
            </Button>
            <h3 className="px-1 pb-1 text-sm font-medium">{CATEGORY_LABEL[category]}</h3>
            {inCategory.map(row)}
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.length > 0 && (
              <section className="space-y-1">
                <h3 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Preferiti
                </h3>
                {favorites.map(row)}
              </section>
            )}
            {recents.length > 0 && (
              <section className="space-y-1">
                <h3 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Recenti
                </h3>
                {recents.map(row)}
              </section>
            )}
            <section className="space-y-1">
              <h3 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Categorie
              </h3>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className="flex min-h-12 w-full items-center justify-between rounded-lg px-3 text-left text-sm hover:bg-muted"
                >
                  {CATEGORY_LABEL[c]}
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </button>
              ))}
            </section>
            {!favorites.length && (
              <p className="px-1 text-xs text-muted-foreground">
                Suggerimento: tocca la stella accanto a un alimento per aggiungerlo ai preferiti.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function FoodRow({ food, acuteMode, onPick }: { food: Food; acuteMode: boolean; onPick: () => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg hover:bg-muted">
      <button
        type="button"
        onClick={onPick}
        className="flex min-h-12 min-w-0 flex-1 flex-col items-start justify-center gap-1 px-3 py-2 text-left"
      >
        <span className="text-sm leading-snug font-medium">{food.name}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={food.status} />
          <AcuteBadge food={food} acuteMode={acuteMode} />
          {food.maxPortion && (
            <span className="text-xs text-muted-foreground">max {formatPortion(food.maxPortion)}</span>
          )}
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0"
        onClick={() => repo.foods.toggleFavorite(food.id)}
        aria-label={food.favorite ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}
        aria-pressed={!!food.favorite}
      >
        <StarIcon className={cn('size-5', food.favorite && 'fill-amber-400 text-amber-500')} />
      </Button>
    </div>
  )
}
