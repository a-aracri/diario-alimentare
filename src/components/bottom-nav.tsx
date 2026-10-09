import {
  ActivityIcon,
  CalendarRangeIcon,
  EllipsisIcon,
  LightbulbIcon,
  NotebookPenIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { href } from '@/hooks/use-route'

const TABS = [
  { path: '/', label: 'Diario', icon: NotebookPenIcon },
  { path: '/sintomi', label: 'Sintomi', icon: ActivityIcon },
  { path: '/idee', label: 'Idee', icon: LightbulbIcon },
  { path: '/riepilogo', label: 'Riepilogo', icon: CalendarRangeIcon },
  { path: '/altro', label: 'Altro', icon: EllipsisIcon },
]

const MAIN_PATHS = TABS.map((t) => t.path)

export function BottomNav({ path }: { path: string }) {
  // Le pagine secondarie (integratori, alimenti, impostazioni…) stanno sotto "Altro".
  const active = MAIN_PATHS.includes(path) ? path : '/altro'
  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-background/80 print:hidden"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-5 pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        {TABS.map(({ path: to, label, icon: Icon }) => {
          const isActive = active === to
          return (
            <a
              key={to}
              href={href(to)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <Icon className={cn('size-5', isActive && 'stroke-[2.5]')} />
              {label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
