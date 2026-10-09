import { DatabaseBackupIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/hooks/use-data'
import { isBackupDue, today } from '@/lib/dates'
import { shareOrDownload } from '@/lib/files'
import { repo } from '@/repo'

/** Esporta tutti i dati in JSON e aggiorna la data dell'ultimo backup. */
export async function exportBackupFile(): Promise<void> {
  try {
    const backup = await repo.backup.export()
    const result = await shareOrDownload(
      `diario-fodmap-backup-${today()}.json`,
      JSON.stringify(backup, null, 2),
      'application/json',
    )
    if (result === 'cancelled') return
    await repo.settings.update({ lastBackupAt: backup.exportedAt })
    toast.success('Backup esportato', {
      description: 'Conservalo in un posto sicuro, ad esempio in File o iCloud Drive.',
    })
  } catch (err) {
    console.error(err)
    toast.error('Esportazione non riuscita')
  }
}

/** Avviso se l'ultimo backup ha più di 7 giorni. */
export function BackupReminder() {
  const settings = useSettings()
  if (!settings || !isBackupDue(settings.lastBackupAt, settings.createdAt)) return null
  return (
    <Alert className="border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-400">
      <DatabaseBackupIcon />
      <AlertTitle>
        {settings.lastBackupAt ? 'Ultimo backup più di 7 giorni fa' : 'Non hai ancora fatto un backup'}
      </AlertTitle>
      <AlertDescription className="space-y-2 text-foreground/80">
        <p>I dati sono salvati solo su questo iPhone: esporta una copia di sicurezza.</p>
        <Button variant="outline" className="h-10" onClick={exportBackupFile}>
          Fai il backup ora
        </Button>
      </AlertDescription>
    </Alert>
  )
}
