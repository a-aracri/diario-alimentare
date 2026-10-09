import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ACUTE_TAG_LABEL, STATUS_LABEL } from '@/model/constants'
import type { Food, FoodStatus } from '@/model/types'

export const STATUS_STYLE: Record<FoodStatus, string> = {
  permesso: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  limite: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  evitare: 'bg-destructive/10 text-destructive',
  verificare: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
}

export function StatusBadge({ status, className }: { status: FoodStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn(STATUS_STYLE[status], className)}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

export function isAcuteFood(food: Food | undefined): boolean {
  return !!food?.tags?.some((t) => ACUTE_TAG_LABEL[t])
}

/** Badge "sconsigliato in fase acuta", mostrato solo se la modalità è attiva. */
export function AcuteBadge({ food, acuteMode }: { food?: Food; acuteMode?: boolean }) {
  if (!acuteMode || !isAcuteFood(food)) return null
  return (
    <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 dark:text-orange-400">
      Fase acuta
    </Badge>
  )
}
