import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { AcuteAdvice } from '@/components/acute-banner'
import { Page, SectionTitle } from '@/components/page'
import { SuggestionDrawer } from '@/components/suggestion-drawer'
import { Notice } from '@/components/warning-list'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BREAKFAST_GUIDE,
  PLAN_NOTES,
  SUGGESTION_GROUP_NOTES,
  SUGGESTIONS,
  type Suggestion,
  type SuggestionKind,
} from '@/data/piano'
import { useSettings } from '@/hooks/use-data'
import { useRoute } from '@/hooks/use-route'
import { useSelectedDate } from '@/hooks/selected-date'
import { formatShort } from '@/lib/dates'
import { repo } from '@/repo'

const TABS: { id: SuggestionKind | 'acuta'; label: string }[] = [
  { id: 'colazione', label: 'Colazione' },
  { id: 'spuntino', label: 'Spuntini' },
  { id: 'pasto', label: 'Pranzo e cena' },
  { id: 'acuta', label: 'Gastrite' },
]

const eggsLabel = (n: number) => (n === 0 ? 'Senza uova' : n === 1 ? '1 uovo' : `${n} uova`)

function BreakfastGuide() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base leading-snug">{BREAKFAST_GUIDE.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ul className="space-y-1">
          {BREAKFAST_GUIDE.parts.map((p) => (
            <li key={p.label}>
              <span className="font-medium">{p.label}:</span> {p.text}
            </li>
          ))}
        </ul>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {BREAKFAST_GUIDE.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function IdeasPage() {
  const { params } = useRoute()
  const { date } = useSelectedDate()
  const settings = useSettings()
  const [tab, setTab] = useState<string>(params.get('tab') ?? 'colazione')
  const [drawer, setDrawer] = useState<{ open: boolean; suggestion?: Suggestion }>({ open: false })

  const card = (s: Suggestion) => (
    <Card key={s.id} size="sm">
      <CardHeader>
        <CardTitle className="text-base leading-snug">{s.title}</CardTitle>
        {s.eggs != null && (
          <CardAction>
            <Badge variant="secondary">{eggsLabel(s.eggs)}</Badge>
          </CardAction>
        )}
        {s.description && <CardDescription>{s.description}</CardDescription>}
      </CardHeader>
      {(s.ingredients || s.flags || s.hint) && (
        <CardContent className="space-y-2">
          {s.ingredients && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm">
              {s.ingredients.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
          {s.flags?.map((f) => (
            <Notice key={f.text} level={f.level}>
              {f.text}
            </Notice>
          ))}
          {s.hint && <p className="text-sm text-muted-foreground">{s.hint}</p>}
        </CardContent>
      )}
      <CardFooter className="bg-transparent">
        <Button
          variant="outline"
          className="h-11 w-full"
          onClick={() => setDrawer({ open: true, suggestion: s })}
        >
          <PlusIcon /> Aggiungi al pasto
        </Button>
      </CardFooter>
    </Card>
  )

  const groups = (kind: SuggestionKind) => {
    const list = SUGGESTIONS.filter((s) => s.kind === kind)
    const names = [...new Set(list.map((s) => s.group ?? ''))]
    return names.map((g) => ({ group: g, items: list.filter((s) => (s.group ?? '') === g) }))
  }

  return (
    <Page title="Idee dal piano" subtitle={`Tocca un'opzione per aggiungerla al ${formatShort(date)}`}>
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList className="grid h-11 w-full grid-cols-4">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="px-1 text-xs sm:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {(['colazione', 'spuntino', 'pasto'] as const).map((kind) => (
          <TabsContent key={kind} value={kind} className="space-y-3 pt-2">
            <p className="px-1 text-sm text-muted-foreground">{PLAN_NOTES[kind]}</p>
            {kind === 'colazione' && <BreakfastGuide />}
            {groups(kind).map(({ group, items }) => (
              <div key={group} className="space-y-3">
                {group && (
                  <SectionTitle>
                    {group}
                    {SUGGESTION_GROUP_NOTES[group] && (
                      <span className="font-normal"> · {SUGGESTION_GROUP_NOTES[group]}</span>
                    )}
                  </SectionTitle>
                )}
                {items.map(card)}
              </div>
            ))}
          </TabsContent>
        ))}

        <TabsContent value="acuta" className="space-y-3 pt-2">
          <Card size="sm">
            <CardContent>
              <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
                <span>
                  <span className="block font-medium">Modalità fase acuta</span>
                  <span className="block text-xs text-muted-foreground">
                    Evidenzia come sconsigliati agrumi, cioccolato, tè non deteinato, caffè non
                    decaffeinato, menta e succhi di frutta.
                  </span>
                </span>
                <Switch
                  checked={!!settings?.acuteMode}
                  onCheckedChange={(checked) => repo.settings.update({ acuteMode: checked })}
                  className="scale-125"
                />
              </label>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">Consigli in fase acuta di gastrite/reflusso</CardTitle>
            </CardHeader>
            <CardContent>
              <AcuteAdvice />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SuggestionDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        suggestion={drawer.suggestion}
        date={date}
      />
    </Page>
  )
}
