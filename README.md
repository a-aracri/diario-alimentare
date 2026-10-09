# Diario alimentare Low FODMAP

PWA in italiano per tenere il diario alimentare e dei sintomi durante una dieta Low FODMAP.
Pensata per iPhone ("Aggiungi a Home"), funziona offline e salva i dati solo sul dispositivo.

**App:** pubblicata su GitHub Pages all'indirizzo `https://<utente-github>.github.io/diario-alimentare/`.

## Funzioni

- Diario per pasto con ricerca nel database alimenti, preferiti, recenti e "ripeti il pasto di ieri"
- Sintomi con intensità 0–10, feci con scala di Bristol, "nessun sintomo oggi"
- Database alimenti del piano (permesso, con limite, da evitare, da verificare) e alimenti personali
- Avvisi gentili per alimenti da evitare, porzioni superate e limiti (olio EVO, uova, latticini
  delattosati, frutta negli spuntini)
- Integratori con checklist giornaliera e promemoria
- Idee del piano (colazioni con ricette, spuntini, pranzo e cena) da aggiungere con un tocco
- Modalità fase acuta gastrite/reflusso
- Fase di reintroduzione per gruppo FODMAP
- Riepilogo settimanale, export CSV, vista stampabile/PDF, backup e ripristino JSON

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:5173/diario-alimentare/
npm test
npm run build
```

Architettura e convenzioni sono descritte in [CLAUDE.md](CLAUDE.md).

## Installazione su iPhone

Apri l'URL in Safari → Condividi → **Aggiungi alla schermata Home**. Fai un backup JSON
regolarmente (Altro → Impostazioni e backup): i dati non lasciano il telefono.
