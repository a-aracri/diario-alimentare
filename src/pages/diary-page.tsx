import { PlusIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AcuteBanner } from '@/components/acute-banner'
import { BackupReminder } from '@/components/backup'
import { CountersCard } from '@/components/counters-card'
import { DateNav } from '@/components/date-nav'
import { EntryDrawer } from '@/components/entry-drawer'
import { MealSection } from '@/components/meal-section'
import { Page } from '@/components/page'
import { SupplementsCard } from '@/components/supplements-card'
import { Button } from '@/components/ui/button'
import { useEntries, useFoodIndex, useSettings, useWeekEntries } from '@/hooks/use-data'
import { useSelectedDate } from '@/hooks/selected-date'
import { diffDays, guessMeal, nowTime, today } from '@/lib/dates'
import { computeCounters } from '@/lib/limits'
import { sortEntries } from '@/lib/report'
import { MEAL_LABEL, MEALS } from '@/model/constants'
import type { Entry, MealId } from '@/model/types'
import { repo } from '@/repo'

export function DiaryPage() {
  const { date, setDate } = useSelectedDate()
  const settings = useSettings()
  const index = useFoodIndex()
  const entries = useEntries(date)
  const weekEntries = useWeekEntries(date)
  const [drawer, setDrawer] = useState<{ open: boolean; meal: MealId; entry?: Entry }>({
    open: false,
    meal: 'colazione',
  })

  const byMeal = useMemo(() => {
    const map = new Map<MealId, Entry[]>()
    for (const e of sortEntries(entries ?? [])) map.set(e.meal, [...(map.get(e.meal) ?? []), e])
    return map
  }, [entries])

  const counters = useMemo(
    () => (index && settings && weekEntries ? computeCounters(date, weekEntries, index, settings.limits) : []),
    [date, weekEntries, index, settings],
  )

  const dietDay = settings?.dietStartDate ? diffDays(settings.dietStartDate, date) + 1 : undefined

  async function repeat(meal: MealId) {
    const n = await repo.entries.repeatFromPreviousDay(date, meal)
    if (n) toast.success(`${n === 1 ? 'Copiata 1 voce' : `Copiate ${n} voci`} da ieri in ${MEAL_LABEL[meal]}`)
    else toast.info(`Ieri non ci sono voci in ${MEAL_LABEL[meal]}`)
  }

  const quickMeal = date === today() ? guessMeal(nowTime()) : 'fuori-pasto'

  return (
    <Page
      title="Diario"
      subtitle={dietDay && dietDay > 0 ? `Giorno ${dietDay} della dieta` : 'Diario alimentare Low FODMAP'}
      actions={
        <Button
          size="icon"
          className="size-11"
          onClick={() => setDrawer({ open: true, meal: quickMeal })}
          aria-label="Aggiungi alimento"
        >
          <PlusIcon className="size-5" />
        </Button>
      }
    >
      <DateNav date={date} onChange={setDate} />
      <BackupReminder />
      {settings?.acuteMode && <AcuteBanner />}
      <SupplementsCard date={date} />

      {MEALS.map((m) => (
        <MealSection
          key={m.id}
          meal={m.id}
          entries={byMeal.get(m.id) ?? []}
          index={index}
          acuteMode={!!settings?.acuteMode}
          onAdd={() => setDrawer({ open: true, meal: m.id })}
          onEdit={(entry) => setDrawer({ open: true, meal: entry.meal, entry })}
          onRepeat={() => repeat(m.id)}
        />
      ))}

      {counters.length > 0 && <CountersCard counters={counters} />}

      <EntryDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}
        date={date}
        meal={drawer.meal}
        entry={drawer.entry}
      />
    </Page>
  )
}
