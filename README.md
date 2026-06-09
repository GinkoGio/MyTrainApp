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
- **Import / export schede** — esporta una scheda come file `.json` (backup esatto) o `.csv` (leggibile e modificabile in un foglio di calcolo) e reimporta entrambi i formati: i dati vengono validati e gli id rigenerati, così l'import diventa sempre una nuova scheda senza conflitti
- **Condivisione via QR / link** — condividi una scheda con un QR (o un link): chi lo riceve inquadra il codice con la fotocamera del telefono e l'app si apre già pronta a importarla. I dati viaggiano compressi nel link stesso (nessun server); le schede troppo grandi per un QR restano condivisibili via file
- **Generazione link in blocco (trainer)** — in *Schede* il pulsante **Blocco** apre la pagina **Strumenti** ("Genera link in blocco"): incolli un CSV (una riga per esercizio, colonna `cliente` per raggruppare) e ottieni un link/QR per ogni cliente, con "copia tutti i link". Pensato per chi prepara molte schede ogni settimana partendo da un foglio di calcolo
- **Nessun server** — tutti i dati sono salvati in `localStorage`, l'app funziona offline (service worker)

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
│   ├── ActiveWorkout.tsx  # Sessione attiva con timer e chime sonoro
│   ├── History.tsx        # Storico allenamenti
│   └── Tools.tsx          # Strumenti: genera link in blocco da CSV (/tools)
├── store/
│   ├── usePlanStore.ts    # Schede e giorni (localStorage: "train-plans")
│   ├── useSessionStore.ts # Sessioni attive e log (localStorage: "train-sessions")
│   └── selectors.ts       # Selettori derivati (es. prossima sessione)
├── utils/
│   ├── id.ts              # Generazione id univoci
│   ├── planTransfer.ts    # Export/import di una scheda in JSON (validazione + nuovi id)
│   └── csvImport.ts       # Parser/serializzatore CSV (singola scheda e blocco)
├── components/
│   ├── BottomNav.tsx      # Barra di navigazione
│   ├── ShareModal.tsx     # Condivisione scheda via QR / link
│   └── ErrorBoundary.tsx  # Cattura errori di rendering
├── data/
│   └── exerciseLibrary.ts # Libreria nomi esercizi per l'autocomplete
└── types/
    └── index.ts           # Tipi TypeScript condivisi

public/
├── manifest.webmanifest   # Manifest PWA
├── sw.js                  # Service worker (shell offline)
└── icon.svg               # Icona app
```

## Requisiti

- **Node ≥ 20.19** (richiesto da Vite 8) e npm. Il `package.json` non fissa un campo `engines`: è una raccomandazione per chi clona.

## Avvio

```bash
npm install
npm run dev
```

L'app sarà disponibile su `http://localhost:5173/MyTrainApp/` (la `base` è `/MyTrainApp/`, vedi *Deploy*).

## Build per produzione

```bash
npm run build
```

`npm run build` esegue `tsc -b && vite build`: l'output è nella cartella `dist/`, pronto per qualsiasi hosting statico.

## Deploy

Il progetto è configurato per essere servito **sotto la sottocartella `/MyTrainApp/`** (tipico GitHub Pages di un repo):

- `base: '/MyTrainApp/'` in [`vite.config.ts`](vite.config.ts) — prefissa gli asset prodotti.
- `basename="/MyTrainApp"` in [`App.tsx`](src/App.tsx) — allinea il router React.

Per ospitare l'app sulla **root** di un dominio o CDN (`https://esempio.com/`), riporta **entrambi** i valori a `/`.

## Test

```bash
npm test          # esegue la suite una volta
npm run test:watch # modalità watch
```

I test (Vitest) — 6 file, 68 test — coprono la logica core:
avanzamento della sessione e timer di pausa (`useSessionStore`),
gestione e duplicazione di schede/giorni/settimane (`usePlanStore`),
selettori derivati (`selectors`), export/import JSON di una scheda
(`planTransfer`), parsing CSV singolo e in blocco (`csvImport`) e
l'autocomplete degli esercizi (`exerciseLibrary`).

## Dati e privacy

Nessun backend: tutti i dati vivono nel browser, in `localStorage`
(`train-plans` per le schede, `train-sessions` per sessioni e storico).
Le schede condivise via QR/link non passano da nessun server — viaggiano
**compresse (lz-string) nell'hash dell'URL** stesso; chi apre il link se le
importa in locale.

## PWA / offline

Il service worker [`public/sw.js`](public/sw.js) fornisce la shell offline, così
l'app si riapre senza rete dopo la prima visita. Unica eccezione: i font
(Space Grotesk / Space Mono / Inter) sono caricati da Google Fonts in
[`src/index.css`](src/index.css), quindi dipendono dalla rete al primo
caricamento.

## Formato CSV (import in blocco)

Una riga = un esercizio; la colonna `cliente` raggruppa le righe in schede
separate. Intestazioni richieste: `cliente, settimana, giorno, esercizio, serie,
reps, peso` (`etichetta` e `pausa` sono opzionali; sono accettati sinonimi come
`week`, `sets`, `kg`, `rest`). Delimitatore `,` o `;` (Excel IT).

```csv
cliente,settimana,giorno,etichetta,esercizio,serie,reps,peso,pausa
Mario Rossi,1,1,Push,Panca piana,5,6,60,90
Mario Rossi,1,2,Pull,Trazioni,4,max,1/2 peso max,90
Mario Rossi,1,2,Pull,Rematore,2-1-1,8-7-7,12-11-9,90
Anna Bianchi,1,1,Full body,Squat,4,8,40,90
```

Per le **serie variabili** usa gruppi separati da `-` allineati tra `serie`,
`reps` e `peso`: `serie 2-1-1 / reps 8-7-7 / peso 12-11-9` produce 4 serie
(8@12, 8@12, 7@11, 7@9).

## Flusso di utilizzo

1. **Crea una scheda** — vai in *Schede*, dai un nome alla scheda e aggiungi i giorni
2. **Configura gli esercizi** — per ogni giorno aggiungi gli esercizi con serie, reps, kg e tempo di pausa
3. **Allenati** — dalla Home premi *Inizia allenamento*; l'app ricorda l'ultima sessione fatta e propone automaticamente quella successiva
4. **Consulta lo storico** — in *Storico* trovi tutti gli allenamenti passati con i pesi effettivamente usati
