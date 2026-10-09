import { DatabaseBackupIcon, DownloadIcon } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useBackupData, useSettings } from '@/hooks/use-data'
import { isBackupDue, today } from '@/lib/dates'
import { shareFile } from '@/lib/files'
import { cn } from '@/lib/utils'
import { repo } from '@/repo'

/**
 * File di backup sempre pronto e aggiornato: il tocco su "Esporta" può aprire
 * subito il foglio di condivisione (su iPhone deve partire dal gesto).
 */
function useBackupFile() {
  const backup = useBackupData()
  return useMemo(
    () =>
      backup && {
        exportedAt: backup.exportedAt,
        file: new File([JSON.stringify(backup, null, 2)], `diario-fodmap-backup-${today()}.json`, {
          type: 'application/json',
        }),
      },
    [backup],
  )
}

/** Pulsante che esporta tutti i dati in JSON e aggiorna la data dell'ultimo backup. */
export function BackupButton({
  label = 'Esporta backup completo (JSON)',
  variant = 'default',
  className,
}: {
  label?: string
  variant?: 'default' | 'outline'
  className?: string
}) {
  const backup = useBackupFile()
  return (
    <Button
      variant={variant}
      className={cn('h-11', className)}
      disabled={!backup}
      onClick={async () => {
        if (!backup) return
        try {
          // Nessuna attesa prima di shareFile: su iPhone la condivisione deve partire dal tocco.
          const result = await shareFile(backup.file)
          if (result === 'cancelled') return
          await repo.settings.update({ lastBackupAt: backup.exportedAt })
          toast.success('Backup esportato', {
            description: 'Conservalo in un posto sicuro, ad esempio in File o iCloud Drive.',
          })
        } catch (err) {
          console.error(err)
          toast.error('Esportazione non riuscita')
        }
      }}
    >
      <DownloadIcon /> {label}
    </Button>
  )
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
        <BackupButton label="Fai il backup ora" variant="outline" className="h-10" />
      </AlertDescription>
    </Alert>
  )
}
