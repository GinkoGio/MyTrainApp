# MyTrainApp

App web per gestire e seguire le schede di allenamento in palestra, direttamente dal browser del telefono.

## Funzionalità

- **Gestione schede** — crea più schede di allenamento, ognuna organizzata per settimane e giorni (Settimana 1 Giorno 1, Settimana 1 Giorno 2, ecc.)
- **Editor esercizio veloce** — imposta *serie × ripetizioni × peso* in un colpo solo con steppers `+/−`; passa a "serie variabili" solo quando ti servono carichi diversi per serie (piramidali, drop set)
- **Suggerimenti nomi esercizi** — autocomplete con una libreria di esercizi comuni più i nomi che hai già usato nelle tue schede
- **Duplica giorno e settimana** — copia un giorno o un'intera settimana per ripeterne la struttura cambiando solo i pesi: ideale per i programmi multi-settimana
- **Riordino esercizi** — sposta su e giù gli esercizi dentro un giorno
- **Sessione attiva** — interfaccia pensata per l'uso in palestra: mostra l'esercizio e la serie corrente, con pulsanti +/− per modificare reps e kg al volo
- **Timer di pausa** — countdown automatico tra una serie e l'altra con segnale sonoro alla fine; skip disponibile in qualsiasi momento
- **Storico sessioni** — ogni allenamento completato viene salvato con i pesi e le ripetizioni realmente eseguiti
- **Nessun server** — tutti i dati sono salvati in `localStorage`, l'app funziona offline

## Stack tecnico

| Tecnologia | Ruolo |
|---|---|
| [Vite](https://vite.dev) + React 19 + TypeScript | Build e framework UI |
| [Zustand](https://zustand-demo.pmnd.rs) + `persist` | State management con persistenza localStorage |
| [React Router](https://reactrouter.com) | Navigazione tra le pagine |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |

## Struttura del progetto

```
src/
├── pages/
│   ├── Home.tsx           # Dashboard: prossima sessione da fare
│   ├── PlanBuilder.tsx    # Editor schede, giorni ed esercizi
│   ├── ActiveWorkout.tsx  # Sessione attiva con timer
│   └── History.tsx        # Storico allenamenti
├── store/
│   ├── usePlanStore.ts    # Schede e giorni (localStorage: "train-plans")
│   └── useSessionStore.ts # Sessioni attive e log (localStorage: "train-sessions")
├── data/
│   └── exerciseLibrary.ts # Libreria nomi esercizi per l'autocomplete
└── types/
    └── index.ts           # Tipi TypeScript condivisi
```

## Avvio

```bash
npm install
npm run dev
```

L'app sarà disponibile su `http://localhost:5173`.

## Build per produzione

```bash
npm run build
```

L'output è nella cartella `dist/` e può essere hostato su qualsiasi CDN statico (Vercel, Netlify, GitHub Pages, ecc.).

## Test

```bash
npm test          # esegue la suite una volta
npm run test:watch # modalità watch
```

I test (Vitest) coprono la logica core: avanzamento della sessione e timer
di pausa (`useSessionStore`), duplicazione di giorni/settimane (`usePlanStore`)
e l'autocomplete degli esercizi.

## Flusso di utilizzo

1. **Crea una scheda** — vai in *Schede*, dai un nome alla scheda e aggiungi i giorni
2. **Configura gli esercizi** — per ogni giorno aggiungi gli esercizi con serie, reps, kg e tempo di pausa
3. **Allenati** — dalla Home premi *Inizia allenamento*; l'app ricorda l'ultima sessione fatta e propone automaticamente quella successiva
4. **Consulta lo storico** — in *Storico* trovi tutti gli allenamenti passati con i pesi effettivamente usati
