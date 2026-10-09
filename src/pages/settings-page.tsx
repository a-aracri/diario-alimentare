import { MonitorSmartphoneIcon, MoonIcon, SunIcon, UploadIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { BackupButton } from '@/components/backup'
import { Page } from '@/components/page'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { DEFAULT_LIMITS } from '@/data/piano'
import { useSettings } from '@/hooks/use-data'
import { navigate } from '@/hooks/use-route'
import { diffDays, formatDateTime, today } from '@/lib/dates'
import type { Limits } from '@/model/types'
import { BackupError, repo, type BackupFile } from '@/repo'

const LIMIT_FIELDS: { key: keyof Limits; label: string; hint: string }[] = [
  { key: 'oilTbspPerDay', label: 'Olio EVO', hint: 'cucchiai al giorno' },
  { key: 'eggsPerWeek', label: 'Uova', hint: 'a settimana' },
  { key: 'dairyGramsPerServing', label: 'Latticini delattosati', hint: 'grammi per porzione' },
  { key: 'dairyTimesPerWeek', label: 'Latticini delattosati', hint: 'volte a settimana' },
  { key: 'fruitPerSnack', label: 'Frutta', hint: 'frutti per spuntino' },
]

export function SettingsPage() {
  const settings = useSettings()
  const { theme, setTheme } = useTheme()
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  if (!settings) return null
  const dietDay = settings.dietStartDate ? diffDays(settings.dietStartDate, today()) + 1 : undefined

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      setPending(repo.backup.parse(await file.text()))
    } catch (err) {
      toast.error(err instanceof BackupError ? err.message : 'Impossibile leggere il file.')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function restore() {
    if (!pending) return
    await repo.backup.restore(pending)
    setPending(null)
    toast.success('Backup ripristinato')
    navigate('/')
  }

  return (
    <Page title="Impostazioni" back="/altro">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Dieta</CardTitle>
          {dietDay && dietDay > 0 && <CardDescription>Oggi è il giorno {dietDay}.</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="diet-start">Data di inizio</FieldLabel>
            <Input
              id="diet-start"
              type="date"
              value={settings.dietStartDate ?? ''}
              onChange={(e) => repo.settings.update({ dietStartDate: e.target.value || undefined })}
            />
          </Field>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Fase acuta gastrite/reflusso</span>
              <span className="block text-xs text-muted-foreground">Evidenzia gli alimenti sconsigliati.</span>
            </span>
            <Switch
              checked={settings.acuteMode}
              onCheckedChange={(checked) => repo.settings.update({ acuteMode: checked })}
              className="scale-125"
            />
          </label>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Limiti</CardTitle>
          <CardDescription>Modificali se la nutrizionista cambia le indicazioni.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {LIMIT_FIELDS.map((f) => (
            <LimitInput
              key={`${f.key}-${settings.limits[f.key]}`}
              id={`limit-${f.key}`}
              label={f.label}
              hint={f.hint}
              value={settings.limits[f.key]}
              onChange={(value) => repo.settings.update({ limits: { ...settings.limits, [f.key]: value } })}
            />
          ))}
          <Button
            variant="outline"
            className="h-11 w-full"
            onClick={async () => {
              await repo.settings.update({ limits: { ...DEFAULT_LIMITS } })
              toast.success('Limiti del piano ripristinati')
            }}
          >
            Ripristina i valori del piano
          </Button>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Aspetto</CardTitle>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            variant="outline"
            className="grid w-full grid-cols-3"
            value={[theme ?? 'system']}
            onValueChange={(v) => v[0] && setTheme(String(v[0]))}
          >
            <ToggleGroupItem value="light" className="h-11">
              <SunIcon /> Chiaro
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" className="h-11">
              <MoonIcon /> Scuro
            </ToggleGroupItem>
            <ToggleGroupItem value="system" className="h-11">
              <MonitorSmartphoneIcon /> Auto
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Backup</CardTitle>
          <CardDescription>
            {settings.lastBackupAt
              ? `Ultimo backup: ${formatDateTime(settings.lastBackupAt)}`
              : 'Non hai ancora fatto un backup.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <BackupButton className="w-full" />
          <Button variant="outline" className="h-11 w-full" onClick={() => fileInput.current?.click()}>
            <UploadIcon /> Ripristina da un file
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <p className="text-xs text-muted-foreground">
            Il ripristino sostituisce tutti i dati presenti su questo dispositivo.
          </p>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Dati</CardTitle>
          <CardDescription>
            Tutto resta su questo dispositivo (IndexedDB). Nessun dato viene inviato online.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="h-11 w-full" onClick={() => navigate('/alimenti')}>
            Gestisci il database alimenti
          </Button>
          <Button variant="ghost" className="h-11 w-full text-destructive" onClick={() => setConfirmClear(true)}>
            Cancella tutti i dati
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ripristinare il backup?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.exportedAt && `Backup del ${formatDateTime(pending.exportedAt)} con ${pending.data.entries.length} voci. `}
              I dati attuali verranno sostituiti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Annulla</AlertDialogCancel>
            <AlertDialogAction className="h-11" onClick={restore}>
              Ripristina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancellare tutti i dati?</AlertDialogTitle>
            <AlertDialogDescription>
              Diario, sintomi, integratori e test verranno eliminati; il database alimenti torna quello del piano.
              Fai prima un backup se vuoi conservarli.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="h-11"
              onClick={async () => {
                await repo.backup.clearAll()
                setConfirmClear(false)
                toast.success('Dati cancellati')
              }}
            >
              Cancella tutto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}

/** Campo numerico salvato all'uscita; si rimonta (key) quando il valore salvato cambia. */
function LimitInput({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: number
  onChange: (value: number) => void
}) {
  const [text, setText] = useState(String(value))
  return (
    <Field orientation="horizontal" className="justify-between">
      <div className="min-w-0">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription className="text-xs">{hint}</FieldDescription>
      </div>
      <Input
        id={id}
        inputMode="numeric"
        className="w-20 text-center"
        value={text}
        onChange={(e) => setText(e.target.value.replace(/\D/g, ''))}
        onBlur={() => {
          const n = Number.parseInt(text, 10)
          if (Number.isFinite(n) && n >= 0 && n !== value) onChange(n)
          else setText(String(value))
        }}
      />
    </Field>
  )
}
