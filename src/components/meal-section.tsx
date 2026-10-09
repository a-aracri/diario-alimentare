import { CopyIcon, EllipsisVerticalIcon, FlameIcon, InfoIcon, PlusIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { resolveFood, type FoodIndex } from '@/lib/foods'
import { exceedsPortion } from '@/lib/limits'
import { formatQuantity } from '@/lib/units'
import { MEAL_LABEL } from '@/model/constants'
import type { Entry, MealId } from '@/model/types'
import { isAcuteFood } from './status-badge'

interface MealSectionProps {
  meal: MealId
  entries: Entry[]
  index?: FoodIndex
  acuteMode: boolean
  onAdd: () => void
  onEdit: (entry: Entry) => void
  onRepeat: () => void
}

export function MealSection({ meal, entries, index, acuteMode, onAdd, onEdit, onRepeat }: MealSectionProps) {
  return (
    <Card size="sm" className="gap-2">
      <CardHeader className="items-center">
        <CardTitle className="text-base">{MEAL_LABEL[meal]}</CardTitle>
        <CardAction className="row-span-1 flex items-center gap-1 self-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label={`Altre azioni per ${MEAL_LABEL[meal]}`}
                />
              }
            >
              <EllipsisVerticalIcon className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto">
              <DropdownMenuItem className="min-h-11 px-3" onClick={onRepeat}>
                <CopyIcon /> Ripeti il pasto di ieri
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" className="size-11" onClick={onAdd} aria-label={`Aggiungi a ${MEAL_LABEL[meal]}`}>
            <PlusIcon className="size-5" />
          </Button>
        </CardAction>
      </CardHeader>
      {entries.length > 0 && (
        <CardContent className="px-1.5">
          <ul>
            {entries.map((e) => {
              const food = index ? resolveFood(e, index) : undefined
              const avoid = food?.status === 'evitare'
              const check = food?.status === 'verificare'
              const over = exceedsPortion(e, food)
              const acute = acuteMode && isAcuteFood(food)
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onEdit(e)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-md px-1.5 py-1.5 text-left hover:bg-muted"
                  >
                    <span className="w-11 shrink-0 text-xs text-muted-foreground tabular-nums">{e.time}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block leading-snug">{e.name}</span>
                      {e.note && <span className="block truncate text-xs text-muted-foreground">{e.note}</span>}
                    </span>
                    {(e.quantity != null || e.unit) && (
                      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                        {formatQuantity(e.quantity, e.unit)}
                      </span>
                    )}
                    {avoid || over ? (
                      <TriangleAlertIcon
                        className={avoid ? 'size-4 shrink-0 text-destructive' : 'size-4 shrink-0 text-amber-500'}
                        aria-label={avoid ? 'Da evitare' : 'Oltre la porzione'}
                      />
                    ) : acute ? (
                      <FlameIcon className="size-4 shrink-0 text-orange-500" aria-label="Sconsigliato in fase acuta" />
                    ) : check ? (
                      <InfoIcon className="size-4 shrink-0 text-sky-500" aria-label="Da verificare" />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}
