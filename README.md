# Intervallum Edzés PWA (MVP)

Mobil-first, offline-képes Progressive Web App intervallumos edzéstervek összeállítására és lejátszására.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- React Router
- vite-plugin-pwa (Workbox)

## Mi készült el az MVP-ben

- `Gyakorlatok` oldal
  - piktogram + magyar név + kategória lista
  - keresés
  - kategória szűrő
  - gyakorlat hozzáadása az edzéstervhez
- `Edzésterv` oldal
  - elemek listája
  - munkaidő és pihenőidő szerkesztése
  - sorrend módosítás (fel/le)
  - törlés és teljes terv törlése
  - tartós mentés `localStorage`-ba
- `Lejátszás` oldal
  - nagy piktogram
  - gyakorlat neve
  - visszaszámláló
  - munka/pihenő állapot
  - automatikus továbblépés
  - az utolsó gyakorlat után nincs pihenő lépés
- PWA/offline
  - manifest + service worker
  - app shell precache
  - adatok (`exercise_database.json`) cache
  - piktogramok runtime cache

## Fontos adatforrások

- `public/exercise_database.json` - gyakorlat-adatbázis
- `public/pictograms/` - piktogramok (PNG)

Megjegyzés: a jelenlegi adatkészlet PNG piktogramokat tartalmaz, SVG jelenleg nincs a forrásban.

## Fejlesztői indítás

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

## PWA offline ellenőrzés (gyors)

1. Nyisd meg az appot browserben.
2. Frissíts egyszer, hogy a service worker települjön.
3. Kapcsold le a hálózatot (DevTools > Network > Offline).
4. Töltsd újra az oldalt: az appnak továbbra is be kell jönnie.

## Projekt struktúra röviden

- `src/` - React alkalmazas
- `public/` - statikus assetek a PWA-hoz
- `tools/python-pipeline/` - legacy adat/piktogram generáló pipeline

## Legacy pipeline

A korábbi Python-alapú generáló script-ek átkerültek ide:

- `tools/python-pipeline/build_exercise_database.py`
- `tools/python-pipeline/build_exercise_html.py`
- `tools/python-pipeline/descriptions.py`
- `tools/python-pipeline/images.py`
