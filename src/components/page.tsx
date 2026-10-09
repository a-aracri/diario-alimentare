import { ChevronLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { navigate } from '@/hooks/use-route'

interface PageProps {
  title: string
  subtitle?: React.ReactNode
  /** Percorso del pulsante "indietro". */
  back?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

/** Intestazione fissa + contenuto, con margini per safe area e barra di navigazione. */
export function Page({ title, subtitle, back, actions, children }: PageProps) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex min-h-14 max-w-2xl items-center gap-1 pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))]">
          {back && (
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              onClick={() => navigate(back)}
              aria-label="Indietro"
            >
              <ChevronLeftIcon className="size-5" />
            </Button>
          )}
          <div className="min-w-0 flex-1 px-2 py-1.5">
            <h1 className="truncate text-lg leading-tight font-semibold">{title}</h1>
            {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
          </div>
          {actions}
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl space-y-4 pt-4 pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(6rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]">
        {children}
      </main>
    </>
  )
}

/** Titolo di sezione dentro una pagina. */
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-2 px-1">
      <h2 className="text-sm font-medium text-muted-foreground">{children}</h2>
      {action}
    </div>
  )
}
