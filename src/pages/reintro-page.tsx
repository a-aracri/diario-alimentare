import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormDrawer } from '@/components/form-drawer'
import { Page, SectionTitle } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_REINTRO_DAYS, DEFAULT_REINTRO_GROUPS } from '@/data/piano'
import { useReintroTests, useSettings } from '@/hooks/use-data'
import { addDays, formatFull, formatShort, today } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { REINTRO_RESULT_LABEL } from '@/model/constants'
import type { ReintroDay, ReintroResult, ReintroTest } from '@/model/types'
import { repo } from '@/repo'

const RESULT_STYLE: Record<ReintroResult, string> = {
  tollerato: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  parziale: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  'non-tollerato': 'bg-destructive/10 text-destructive',
}

export function ReintroPage() {
  const tests = useReintroTests()
  const settings = useSettings()
  const groups = settings?.reintroGroups ?? DEFAULT_REINTRO_GROUPS
  const [drawer, setDrawer] = useState<{ open: boolean; test?: ReintroTest; group?: string }>({ open: false })

  return (
    <Page
      title="Reintroduzione"
      back="/altro"
      actions={
        <Button size="icon" className="size-11" onClick={() => setDrawer({ open: true })} aria-label="Nuovo test">
          <PlusIcon className="size-5" />
        </Button>
      }
    >
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Dopo la fase di eliminazione</CardTitle>
          <CardDescription>
            Pianifica un test per gruppo FODMAP con l’alimento e le dosi indicate dalla nutrizionista, annota i sintomi
            giorno per giorno e segna il risultato. Gruppi e dosi sono modificabili.
          </CardDescription>
        </CardHeader>
      </Card>

      {groups.map((group) => {
        const list = (tests ?? []).filter((t) => t.group === group)
        return (
          <section key={group} className="space-y-2">
            <SectionTitle
              action={
                <Button variant="ghost" className="h-9" onClick={() => setDrawer({ open: true, group })}>
                  <PlusIcon /> Test
                </Button>
              }
            >
              {group}
            </SectionTitle>
            {list.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">Nessun test.</p>
            ) : (
              list.map((t) => <TestCard key={t.id} test={t} onOpen={() => setDrawer({ open: true, test: t })} />)
            )}
          </section>
        )
      })}

      {(() => {
        const other = (tests ?? []).filter((t) => !groups.includes(t.group))
        return other.length > 0 ? (
          <section className="space-y-2">
            <SectionTitle>Altri gruppi</SectionTitle>
            {other.map((t) => (
              <TestCard key={t.id} test={t} onOpen={() => setDrawer({ open: true, test: t })} />
            ))}
          </section>
        ) : null
      })()}

      <GroupsEditor groups={groups} />

      <FormDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        title={drawer.test ? 'Test di reintroduzione' : 'Nuovo test'}
        className="h-[92dvh]"
      >
        <TestForm
          test={drawer.test}
          groups={groups}
          defaultGroup={drawer.group}
          onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        />
      </FormDrawer>
    </Page>
  )
}

function TestCard({ test, onOpen }: { test: ReintroTest; onOpen: () => void }) {
  const end = addDays(test.startDate, Math.max(test.days.length - 1, 0))
  return (
    <Card size="sm" className="py-0">
      <button type="button" onClick={onOpen} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{test.food || 'Alimento da definire'}</span>
          <span className="block text-xs text-muted-foreground">
            {formatShort(test.startDate)} – {formatShort(end)} · {test.days.length} giorni
          </span>
        </span>
        {test.result ? (
          <Badge variant="secondary" className={RESULT_STYLE[test.result]}>
            {REINTRO_RESULT_LABEL[test.result]}
          </Badge>
        ) : (
          <Badge variant="outline">In corso</Badge>
        )}
      </button>
    </Card>
  )
}

function TestForm({
  test,
  groups,
  defaultGroup,
  onClose,
}: {
  test?: ReintroTest
  groups: string[]
  defaultGroup?: string
  onClose: () => void
}) {
  const [group, setGroup] = useState(test?.group ?? defaultGroup ?? groups[0] ?? '')
  const [food, setFood] = useState(test?.food ?? '')
  const [startDate, setStartDate] = useState(test?.startDate ?? today())
  const [days, setDays] = useState<ReintroDay[]>(
    test?.days ?? Array.from({ length: DEFAULT_REINTRO_DAYS }, () => ({ dose: '' })),
  )
  const [result, setResult] = useState<ReintroResult | undefined>(test?.result)
  const [note, setNote] = useState(test?.note ?? '')
  const groupOptions = groups.includes(group) || !group ? groups : [...groups, group]

  const updateDay = (i: number, patch: Partial<ReintroDay>) =>
    setDays((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  async function save() {
    if (!group) {
      toast.error('Scegli il gruppo FODMAP.')
      return
    }
    await repo.reintro.save({
      id: test?.id,
      createdAt: test?.createdAt,
      group,
      food: food.trim(),
      startDate,
      days: days.map((d, i) => ({ ...d, date: addDays(startDate, i) })),
      result,
      note: note.trim() || undefined,
    })
    toast.success('Test salvato')
    onClose()
  }

  async function remove() {
    if (!test) return
    await repo.reintro.remove(test.id)
    toast.success('Test eliminato')
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="reintro-group">Gruppo FODMAP</FieldLabel>
          <NativeSelect id="reintro-group" className="w-full" value={group} onChange={(e) => setGroup(e.target.value)}>
            {groupOptions.map((g) => (
              <NativeSelectOption key={g} value={g}>
                {g}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="reintro-start">Inizio</FieldLabel>
          <Input id="reintro-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="reintro-food">Alimento</FieldLabel>
        <Input id="reintro-food" value={food} placeholder="Es. miele" onChange={(e) => setFood(e.target.value)} />
      </Field>

      <div className="space-y-3">
        {days.map((d, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Giorno {i + 1} <span className="font-normal text-muted-foreground">· {formatShort(addDays(startDate, i))}</span>
              </p>
              {days.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  onClick={() => setDays((all) => all.filter((_, j) => j !== i))}
                  aria-label={`Rimuovi giorno ${i + 1}`}
                >
                  <XIcon />
                </Button>
              )}
            </div>
            <Field>
              <FieldLabel htmlFor={`reintro-dose-${i}`}>Dose</FieldLabel>
              <Input
                id={`reintro-dose-${i}`}
                value={d.dose}
                placeholder="Es. 1 cucchiaino"
                onChange={(e) => updateDay(i, { dose: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-[1fr_6.5rem] gap-3">
              <Field>
                <FieldLabel htmlFor={`reintro-symptoms-${i}`}>Sintomi</FieldLabel>
                <Input
                  id={`reintro-symptoms-${i}`}
                  value={d.symptoms ?? ''}
                  placeholder="Nessuno"
                  onChange={(e) => updateDay(i, { symptoms: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`reintro-int-${i}`}>Intensità</FieldLabel>
                <NativeSelect
                  id={`reintro-int-${i}`}
                  className="w-full"
                  value={d.intensity?.toString() ?? ''}
                  onChange={(e) => updateDay(i, { intensity: e.target.value === '' ? undefined : Number(e.target.value) })}
                >
                  <NativeSelectOption value="">—</NativeSelectOption>
                  {Array.from({ length: 11 }, (_, n) => (
                    <NativeSelectOption key={n} value={n}>
                      {n}/10
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </div>
        ))}
        <Button variant="outline" className="h-11 w-full" onClick={() => setDays((d) => [...d, { dose: '' }])}>
          <PlusIcon /> Aggiungi un giorno
        </Button>
      </div>

      <fieldset>
        <legend className="pb-2 text-sm font-medium">Risultato</legend>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(REINTRO_RESULT_LABEL) as ReintroResult[]).map((r) => (
            <Button
              key={r}
              variant="outline"
              aria-pressed={result === r}
              className={cn('h-auto min-h-11 py-2 text-xs whitespace-normal', result === r && RESULT_STYLE[r], result === r && 'ring-2 ring-current/30')}
              onClick={() => setResult(result === r ? undefined : r)}
            >
              {REINTRO_RESULT_LABEL[r]}
            </Button>
          ))}
        </div>
      </fieldset>

      <Field>
        <FieldLabel htmlFor="reintro-note">Note</FieldLabel>
        <Textarea id="reintro-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
        <Button className="h-11 text-base" onClick={save}>
          Salva
        </Button>
        {test && (
          <Button variant="ghost" className="h-11 text-destructive" onClick={remove}>
            <Trash2Icon /> Elimina test
          </Button>
        )}
      </div>
      {test && <p className="text-xs text-muted-foreground">Creato il {formatFull(test.createdAt.slice(0, 10))}</p>}
    </div>
  )
}

/** Gestione dei gruppi FODMAP (li decide la nutrizionista). */
function GroupsEditor({ groups }: { groups: string[] }) {
  const [name, setName] = useState('')
  const save = (next: string[]) => repo.settings.update({ reintroGroups: next })
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">Gruppi FODMAP</CardTitle>
        <CardDescription>Aggiungi o togli gruppi secondo le indicazioni della nutrizionista.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <span key={g} className="inline-flex items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-sm">
              {g}
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                onClick={() => save(groups.filter((x) => x !== g))}
                aria-label={`Rimuovi ${g}`}
              >
                <XIcon />
              </Button>
            </span>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const n = name.trim()
            if (n && !groups.includes(n)) save([...groups, n])
            setName('')
          }}
        >
          <Input value={name} placeholder="Nuovo gruppo" onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="outline" className="h-11">
            Aggiungi
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
