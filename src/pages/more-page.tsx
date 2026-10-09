import { ChevronRightIcon, DatabaseIcon, FlaskConicalIcon, PillIcon, SettingsIcon } from 'lucide-react'
import { Page } from '@/components/page'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useSettings } from '@/hooks/use-data'
import { href } from '@/hooks/use-route'
import { formatDateTime } from '@/lib/dates'
import { repo } from '@/repo'

const LINKS = [
  { to: '/integratori', label: 'Integratori', description: 'Checklist, durata e promemoria', icon: PillIcon },
  {
    to: '/reintroduzione',
    label: 'Reintroduzione',
    description: 'Test per gruppo FODMAP, dopo l’eliminazione',
    icon: FlaskConicalIcon,
  },
  { to: '/alimenti', label: 'Database alimenti', description: 'Stato, porzioni, preferiti, alimenti personali', icon: DatabaseIcon },
  { to: '/impostazioni', label: 'Impostazioni e backup', description: 'Data di inizio, limiti, tema, backup', icon: SettingsIcon },
]

export function MorePage() {
  const settings = useSettings()
  return (
    <Page title="Altro">
      <Card size="sm" className="py-1">
        <ul className="divide-y">
          {LINKS.map(({ to, label, description, icon: Icon }) => (
            <li key={to}>
              <a href={href(to)} className="flex min-h-16 items-center gap-3 px-4 py-2 hover:bg-muted">
                <Icon className="size-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                </span>
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card size="sm" className="px-4">
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block font-medium">Fase acuta gastrite/reflusso</span>
            <span className="block text-xs text-muted-foreground">Evidenzia gli alimenti sconsigliati e mostra i consigli.</span>
          </span>
          <Switch
            checked={!!settings?.acuteMode}
            onCheckedChange={(checked) => repo.settings.update({ acuteMode: checked })}
            className="scale-125"
          />
        </label>
      </Card>

      <p className="px-1 text-xs text-muted-foreground">
        I dati restano solo su questo dispositivo.
        {settings?.lastBackupAt ? ` Ultimo backup: ${formatDateTime(settings.lastBackupAt)}.` : ' Nessun backup ancora.'}
      </p>
    </Page>
  )
}
