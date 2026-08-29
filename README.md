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
- `AI edző` oldal
  - helyben mentett profil és beszélgetési előzmény
  - AI-szerverhez kötött magyar nyelvű edzői beszélgetés
  - szerverhiba esetén helyi fallback mód
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

## AI-edző fejlesztői beállítása

Az OpenAI-kulcsot soha ne tedd `VITE_` változóba, és ne tárold `localStorage`-ban. Másold a `.env.example` fájlt `.env` néven, majd csak szerveroldali változóként add meg a kulcsot:

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
PORT=8787
```

Az AI-kérés egy saját, függőségmentes Node HTTP szerveren (`server/index.mjs`) megy át, nincs szükség Vercelre vagy más külső platformra. Helyi fejlesztéshez két terminál kell:

```bash
npm run server   # AI API szerver a 8787-es porton
npm run dev      # Vite frontend, /api hívásokat a fenti szerverre proxyzza
```

Ha az API-szerver nem fut, a kliens automatikusan helyi fallback-válaszra vált.

### Telepítés saját VPS-re (pm2, egy paranccsal)

```bash
npm install
npm run deploy
```

A `npm run deploy` legenerálja a buildet, majd a [ecosystem.config.cjs](ecosystem.config.cjs) alapján elindítja (vagy nulla-leállásos újratölti) mindkét pm2 folyamatot egyszerre:

- `fitness-api` – a saját Node API-szerver (`server/index.mjs`), az `OPENAI_API_KEY`-t a `.env` fájlból olvassa
- `fitness-web` – a buildelt frontend kiszolgálása `vite preview`-val, amely a `/api` hívásokat a `fitness-api` folyamatra proxyzza

Alapértelmezett portok: frontend `4173`, API `8787` (mindkettő felülírható `WEB_PORT` / `PORT` környezeti változóval). Első indítás után érdemes elmenteni a pm2 állapotot, hogy szerver-újraindítás után is induljon:

```bash
pm2 save
pm2 startup
```

Naplók: `pm2 logs fitness-api` és `pm2 logs fitness-web`.

Ha a `4173`/`8787` portokat nem szeretnéd közvetlenül kitenni, tegyél elé egy nginx reverse proxyt (TLS-terminálás, domain-kötés céljából) a `fitness-web` portjára; külön nginx statikus fájlkiszolgálás ehhez a beállításhoz már nem szükséges, mert azt a `vite preview` végzi.

**Fontos:** a jelenlegi AI-endpoint még fejlesztői prototípus szintű, nincs benne felhasználói auth, adatbázis vagy rate limit. Publikus, többfelhasználós élesítés előtt ezeket érdemes hozzáadni; a kliensben tárolt profil és chat egyelőre csak az adott böngészőre vonatkozik.

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
