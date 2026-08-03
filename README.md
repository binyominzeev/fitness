# Intervallum Edzes PWA (MVP)

Mobil-first, offline-kepes Progressive Web App intervallumos edzestervek osszeallitasara es lejatszasara.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- React Router
- vite-plugin-pwa (Workbox)

## Mi keszult el az MVP-ben

- `Gyakorlatok` oldal
  - piktogram + magyar nev + kategoria lista
  - kereses
  - kategoria szuro
  - gyakorlat hozzaadasa az edzestervhez
- `Edzesterv` oldal
  - elemek listaja
  - munkaido es pihenoido szerkesztese
  - sorrend modositas (fel/le)
  - torles es teljes terv torlese
  - tartos mentes `localStorage`-ba
- `Lejatszas` oldal
  - nagy piktogram
  - gyakorlat neve
  - visszaszamlalo
  - munka/piheno allapot
  - automatikus tovabblepes
  - az utolso gyakorlat utan nincs piheno lepes
- PWA/offline
  - manifest + service worker
  - app shell precache
  - adatok (`exercise_database.json`) cache
  - piktogramok runtime cache

## Fontos adatforrasok

- `public/exercise_database.json` - gyakorlat adatbazis
- `public/pictograms/` - piktogramok (PNG)

Megjegyzes: a jelenlegi adatkeszlet PNG piktogramokat tartalmaz, SVG jelenleg nincs a forrasban.

## Fejlesztoi inditas

```bash
npm install
npm run dev
```

Alap URL: `http://localhost:5173`

## Build

```bash
npm run lint
npm run build
npm run preview
```

## PWA offline ellenorzes (gyors)

1. Nyisd meg az appot browserben.
2. Frissits egyszer, hogy a service worker telepuljon.
3. Kapcsold le a halozatot (DevTools > Network > Offline).
4. Toltsd ujra az oldalt: az appnak tovabbra is be kell jonnie.

## Projekt struktura roviden

- `src/` - React alkalmazas
- `public/` - statikus assetek a PWA-hoz
- `tools/python-pipeline/` - legacy adat/piktogram generalo pipeline

## Legacy pipeline

A korabbi Python-alapu generalo script-ek atkerultek ide:

- `tools/python-pipeline/build_exercise_database.py`
- `tools/python-pipeline/build_exercise_html.py`
- `tools/python-pipeline/descriptions.py`
- `tools/python-pipeline/images.py`
