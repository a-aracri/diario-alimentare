# CLAUDE.md

PWA in italiano per il diario alimentare di una dieta Low FODMAP. Uso personale, un solo
utente, su iPhone installata con "Aggiungi a Home". Nessun backend: i dati stanno in
IndexedDB sul dispositivo.

## Comandi

```bash
npm run dev            # server di sviluppo (http://localhost:5173/diario-alimentare/)
npm test               # Vitest (logica e repository)
npm run lint           # oxlint
npm run typecheck      # tsc -b
npm run build          # tsc -b + vite build (output in dist/)
npm run preview        # serve dist/ in locale
npm run generate-pwa-assets   # rigenera icone PWA e apple-touch-icon da public/favicon.svg
```

Prima di un commit: `npm run lint && npm test && npm run build`.

## Stack

- Vite + React 19 + TypeScript, router minimale su hash (`src/hooks/use-route.ts`).
- UI: **shadcn/ui** (stile di default `base-nova`, primitive Base UI) + Tailwind CSS v4,
  icone `lucide-react`, toast `sonner`, tema chiaro/scuro con `next-themes`.
- Dati: Dexie (IndexedDB) + `dexie-react-hooks`.
- PWA: `vite-plugin-pwa` (Workbox, `registerType: 'prompt'`).
- Test: Vitest, `fake-indexeddb` per i test del repository.

## Struttura

```
src/
  data/fodmap.ts        alimenti precaricati del piano (stato, categoria, porzioni, tag)
  data/piano.ts         limiti, suggerimenti e ricette, fase acuta, integratori, gruppi FODMAP
  model/                tipi del dominio (types.ts) ed etichette/costanti (constants.ts)
  lib/                  logica pura e testata: date, unità, ricerca, limiti, avvisi,
                        integratori, CSV, riepiloghi; più helper browser (files.ts, pwa.ts)
  repo/                 layer di accesso ai dati (unico punto che usa Dexie)
  hooks/                hook React: dati reattivi (use-data.ts), route, data selezionata
  components/ui/        componenti shadcn generati dalla CLI
  components/           componenti dell'app (drawer, card, navigazione…)
  pages/                una pagina per route
```

Flusso: `pages/components → hooks/use-data.ts → repo → Dexie`. Le scritture passano da
`repo.*`; le letture reattive da `useLiveQuery` negli hook.

## Convenzioni

### Lingua e dati personali
- Testi dell'interfaccia, commenti e messaggi di commit in italiano.
- Nessun dato personale nel codice (nomi, telefoni, nomi di professionisti). I nomi
  commerciali degli integratori sono dati del piano e restano in `src/data/piano.ts`.

### shadcn/ui
- I componenti si aggiungono **solo** con la CLI: `npx shadcn@latest add <nome>`. Evita di
  modificare `src/components/ui/*`: personalizza con `className` dall'esterno.
- Primitive Base UI: per comporre un trigger si usa la prop `render`
  (es. `<DropdownMenuTrigger render={<Button … />}>`), non `asChild`.
- Niente librerie UI aggiuntive. Icone solo da `lucide-react`.
- Colori: variabili CSS di shadcn (`bg-background`, `text-muted-foreground`, …). Per gli stati
  semantici si usano tinte Tailwind leggere (`emerald` permesso, `amber` limite/avviso,
  `destructive` da evitare, `sky` da verificare, `orange` fase acuta) sempre con variante dark.
- Moduli di inserimento in `FormDrawer` (Drawer dal basso), non Dialog. `AlertDialog` solo
  per conferme distruttive.
- Select: `NativeSelect` (picker nativo di iOS).

### Mobile / iOS
- Touch target ≥ 44px: `h-11` sui pulsanti, `size-11` sui pulsanti icona, righe `min-h-11`/`min-h-12`.
- Input e select sono alti ≥ 44px e con testo 16px tramite regole globali in `src/index.css`
  (evitano lo zoom automatico di iOS).
- Safe area: header e barra di navigazione usano `env(safe-area-inset-*)`; i drawer aggiungono
  `pb-[env(safe-area-inset-bottom)]` in fondo al modulo.
- `index.html` contiene i meta per la modalità standalone (`apple-mobile-web-app-*`,
  `viewport-fit=cover`, `theme-color`).

### Dati e repository
- Date locali `YYYY-MM-DD` e orari `HH:MM` (mai `toISOString()` per le date: è UTC). Usa
  `src/lib/dates.ts`. La settimana va da lunedì a domenica.
- Ogni record ha `id` stringa (UUID; slug stabili per i dati precaricati) e `updatedAt`.
  Le eliminazioni passano da `removeWithTombstone` e lasciano una riga in `tombstones`.
- Schema Dexie in `src/repo/db.ts`: per cambiarlo aggiungi `this.version(n+1)`, non modificare
  le versioni esistenti.
- Dati precaricati: se modifichi `src/data/fodmap.ts` o gli integratori in `src/data/piano.ts`,
  incrementa `SEED_VERSION` in `src/repo/seed.ts`. Il seed aggiunge solo i record mancanti e
  rispetta modifiche ed eliminazioni dell'utente. Non cambiare gli `id` esistenti.
- Il backup JSON (`repo.backup`) contiene tutte le tabelle; se cambi il formato incrementa
  `BACKUP_VERSION` e gestisci i file vecchi in `parseBackup`.

### Limiti e avvisi
- Logica in `src/lib/limits.ts` (contatori, aderenza) e `src/lib/warnings.ts` (avvisi per una
  voce), entrambe pure e coperte da test. Gli avvisi sono gentili e **mai bloccanti**.
- I contatori si basano sui tag degli alimenti (`olio-evo`, `uovo`, `latticino-delattosato`,
  `frutto`); i tag `agrumi`, `cioccolato`, `te`, `caffe`, `menta`, `succo-frutta` attivano
  l'avviso in fase acuta.
- Conversioni (`src/lib/units.ts`): g ≈ ml; 1 cucchiaio = 3 cucchiaini; olio 1 cucchiaio ≈ 10 g;
  1 uovo ≈ 55 g; quantità assente = 1 unità (1 cucchiaio d'olio, 1 uovo).
- Latticini delattosati: più voci nello stesso pasto contano come una volta sola.
- I limiti sono modificabili in Impostazioni (`settings.limits`); i valori del piano sono in
  `DEFAULT_LIMITS`.

## Sincronizzazione futura (es. Neon)

L'app è local-first: IndexedDB resta la fonte per la UI. Per sincronizzare:
1. aggiungi un modulo `src/repo/sync.ts` che invia i record con `updatedAt` successivo
   all'ultima sincronizzazione e le `tombstones`, poi scarica le modifiche remote e le applica
   con `bulkPut` / `delete` (vince l'`updatedAt` più recente);
2. le credenziali del database non devono stare nel client: serve un piccolo endpoint
   (es. funzione serverless) davanti a Neon;
3. la UI non cambia: gli hook `useLiveQuery` si aggiornano da soli quando il sync scrive in Dexie.

## Deploy

- GitHub Pages con `.github/workflows/deploy.yml` (push su `main` o avvio manuale).
  Il base path arriva da `actions/configure-pages` tramite `BASE_PATH`; in locale il default è
  `/diario-alimentare/` (vedi `vite.config.ts`).
- `.github/workflows/ci.yml` esegue lint, test e build sugli altri branch e sulle PR.
- Quando esce una nuova versione, l'app mostra un toast "Aggiorna" (il service worker non
  ricarica la pagina da solo, per non interrompere un inserimento).
