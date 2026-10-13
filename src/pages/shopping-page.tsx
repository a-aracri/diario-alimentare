import { PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FormDrawer } from '@/components/form-drawer'
import { Page, SectionTitle } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SHOPPING_HINTS } from '@/data/spesa'
import { useShoppingItems } from '@/hooks/use-data'
import { groupShopping, shoppingCounts, type ShoppingFilter } from '@/lib/shopping'
import { cn } from '@/lib/utils'
import { SHOPPING_SECTION_LABEL, SHOPPING_STATUS_LABEL } from '@/model/constants'
import type { ShoppingItem, ShoppingSection, ShoppingStatus } from '@/model/types'
import { repo } from '@/repo'

const VIEWS: { id: ShoppingFilter; label: string }[] = [
  { id: 'serve', label: 'Mi serve' },
  { id: 'ho', label: 'Ce l’ho' },
  { id: 'tutto', label: 'Tutto' },
]

const STATUSES: ShoppingStatus[] = ['ho', 'serve']

const STATUS_STYLE: Record<ShoppingStatus, string> = {
  ho: 'aria-pressed:bg-emerald-500/15 aria-pressed:text-emerald-700 dark:aria-pressed:text-emerald-400',
  serve: 'aria-pressed:bg-amber-500/15 aria-pressed:text-amber-700 dark:aria-pressed:text-amber-400',
}

export function ShoppingPage() {
  const items = useShoppingItems()
  const [query, setQuery] = useState('')
  // Finché non si sceglie una vista si apre "Mi serve", o l'elenco completo se non serve niente.
  const [view, setView] = useState<ShoppingFilter | null>(null)
  const [drawer, setDrawer] = useState<{ open: boolean; item?: ShoppingItem }>({ open: false })

  const counts = useMemo(() => shoppingCounts(items ?? []), [items])
  const current = view ?? (counts.serve ? 'serve' : 'tutto')
  const searching = !!query.trim()
  // La ricerca guarda in tutta la lista, per non aggiungere doppioni.
  const groups = useMemo(
    () => groupShopping(items ?? [], searching ? 'tutto' : current, query),
    [items, searching, current, query],
  )

  function setStatus(item: ShoppingItem, status: ShoppingStatus | undefined) {
    const previous = item.status
    setView(current)
    void repo.shopping.setStatus(item.id, status)
    // La voce sparisce dalla vista: si può annullare.
    if (!searching && current !== 'tutto' && status !== current) {
      const message = status
        ? `${item.name}: ${SHOPPING_STATUS_LABEL[status].toLowerCase()}`
        : `Tolto da «${SHOPPING_STATUS_LABEL[current]}»: ${item.name}`
      toast(message, {
        id: 'spesa',
        action: { label: 'Annulla', onClick: () => repo.shopping.setStatus(item.id, previous) },
      })
    }
  }

  return (
    <Page
      title="Lista della spesa"
      subtitle={items ? `${counts.serve} da comprare · ${counts.ho} in casa` : undefined}
      back="/altro"
      actions={
        <Button size="icon" className="size-11" onClick={() => setDrawer({ open: true })} aria-label="Nuova voce">
          <PlusIcon className="size-5" />
        </Button>
      }
    >
      <div className="space-y-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cerca nella lista"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Cerca nella lista"
          />
        </div>
        {!searching && (
          <Tabs value={current} onValueChange={(v) => setView(v as ShoppingFilter)}>
            <TabsList className="grid h-11 w-full grid-cols-3">
              {VIEWS.map((v) => (
                <TabsTrigger key={v.id} value={v.id}>
                  {v.label}
                  <span className="text-xs text-muted-foreground tabular-nums">{counts[v.id]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {!searching && current === 'tutto' && (
        <p className="px-1 text-sm text-muted-foreground">
          Segna per ogni voce se ce l’hai o ti serve: in «Mi serve» trovi cosa comprare.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.section} className="space-y-2">
          <div>
            <SectionTitle>{SHOPPING_SECTION_LABEL[g.section]}</SectionTitle>
            {SHOPPING_HINTS[g.section] && <p className="px-1 text-xs text-muted-foreground">{SHOPPING_HINTS[g.section]}</p>}
          </div>
          <Card size="sm" className="py-1">
            <ul className="divide-y">
              {g.items.map((item) => (
                <li key={item.id} className="flex min-h-12 items-center gap-2 py-1 pr-2 pl-1">
                  <button
                    type="button"
                    onClick={() => setDrawer({ open: true, item })}
                    className="min-w-0 flex-1 self-stretch rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  >
                    <span className="block text-sm leading-snug">{item.name}</span>
                    {item.note && <span className="block text-xs text-muted-foreground">{item.note}</span>}
                  </button>
                  <StatusToggle
                    value={item.status}
                    onChange={(status) => setStatus(item, status)}
                    aria-label={`Stato di ${item.name}`}
                  />
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}

      {items && groups.length === 0 && (
        <div className="space-y-3 px-1 text-sm text-muted-foreground">
          {searching ? (
            <>
              <p>Nessuna voce trovata.</p>
              <Button variant="outline" className="h-11 w-full" onClick={() => setDrawer({ open: true })}>
                <PlusIcon /> Aggiungi «{query.trim()}»
              </Button>
            </>
          ) : (
            <>
              <p>
                {current === 'serve'
                  ? 'Non ti serve niente. Quando qualcosa finisce, segnalo con «Mi serve» nell’elenco completo.'
                  : 'Segna con «Ce l’ho» quello che hai già in casa.'}
              </p>
              <Button variant="outline" className="h-11 w-full" onClick={() => setView('tutto')}>
                Vai all’elenco completo
              </Button>
            </>
          )}
        </div>
      )}

      <FormDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        title={drawer.item ? 'Modifica voce' : 'Nuova voce'}
        className="max-h-[92dvh]"
      >
        <ShoppingForm item={drawer.item} initialName={query} onClose={() => setDrawer((d) => ({ ...d, open: false }))} />
      </FormDrawer>
    </Page>
  )
}

/** "Ce l'ho" / "Mi serve": toccando quello già scelto la voce torna da segnare. */
function StatusToggle({
  value,
  onChange,
  className,
  ...props
}: {
  value: ShoppingStatus | undefined
  onChange: (status: ShoppingStatus | undefined) => void
  className?: string
  'aria-label'?: string
}) {
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      className={className}
      value={value ? [value] : []}
      onValueChange={(v) => onChange(v[0] as ShoppingStatus | undefined)}
      {...props}
    >
      {STATUSES.map((s) => (
        <ToggleGroupItem key={s} value={s} className={cn('h-11 flex-1 px-3', STATUS_STYLE[s])}>
          {SHOPPING_STATUS_LABEL[s]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function ShoppingForm({ item, initialName, onClose }: { item?: ShoppingItem; initialName: string; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? initialName.trim())
  const [section, setSection] = useState<ShoppingSection>(item?.section ?? 'altro')
  const [note, setNote] = useState(item?.note ?? '')
  // Una voce nuova di solito è da comprare.
  const [status, setStatus] = useState<ShoppingStatus | undefined>(item ? item.status : 'serve')

  async function save() {
    if (!name.trim()) {
      toast.error('Scrivi il nome.')
      return
    }
    await repo.shopping.save({
      ...item,
      id: item?.id,
      name: name.trim(),
      section,
      note: note.trim() || undefined,
      status,
      custom: item ? item.custom : true,
    })
    toast.success(item ? 'Voce aggiornata' : 'Voce aggiunta')
    onClose()
  }

  async function remove() {
    if (!item) return
    await repo.shopping.remove(item.id)
    toast.success('Voce eliminata')
    onClose()
  }

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="shopping-name">Nome</FieldLabel>
        <Input id="shopping-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor="shopping-section">Reparto</FieldLabel>
        <NativeSelect
          id="shopping-section"
          className="w-full"
          value={section}
          onChange={(e) => setSection(e.target.value as ShoppingSection)}
        >
          {Object.entries(SHOPPING_SECTION_LABEL).map(([id, label]) => (
            <NativeSelectOption key={id} value={id}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="shopping-note">Note</FieldLabel>
        <Textarea id="shopping-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <StatusToggle value={status} onChange={setStatus} className="grid w-full grid-cols-2" aria-label="Stato" />

      <div className="flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
        <Button className="h-11 text-base" onClick={save}>
          Salva
        </Button>
        {item && (
          <Button variant="ghost" className="h-11 text-destructive" onClick={remove}>
            <Trash2Icon /> Elimina dalla lista
          </Button>
        )}
      </div>
    </div>
  )
}
