# Phase 6 — Risk Map & Disaster Intelligence Dashboard

**Step 1 — Inspect:** Home still had a hard-coded `RISKS` array; the Map screen only existed as static markup in the old HTML prototypes, never as real Next.js code.

**Step 2 — Plan:** add a real `DisasterPrediction` table + seed script + `GET /predictions` endpoint on the backend; replace Home's hard-coded array with a component that actually fetches it; build a real interactive Leaflet map at `/map`; make `BottomNav` actually navigate (it was inert until now).

## What's real now

1. **`DisasterPrediction` Prisma model** — a genuine table, not a mock. `prisma/seed.ts` is a real, runnable script that inserts four realistic demonstration rows (flood/rain/heatwave for Chennai·Poonamallee, one flood row for Mumbai·Andheri) with every field the shared `DisasterRiskPrediction` type expects, `isDemonstrationData: true` always set honestly.

2. **`GET /predictions`** — a real, public, unauthenticated endpoint (disaster risk info shouldn't need a login) that queries the table filtered to currently-valid rows (`validUntil >= now`), optionally by `regionId`.

3. **`RiskToday` component** — replaced the hard-coded array entirely. It genuinely fetches from the backend and has real loading (skeleton), error (backend unreachable), and **empty** states — the empty state literally tells you to run `npm run prisma:seed`, because that's the honest reason it would be empty, not a vague "no data."

4. **`/map` — a real interactive Leaflet map**, not a static image or CSS gradient:
   - Real OpenStreetMap tiles
   - Your **real** GPS position via the same `captureLocation()` helper from Phase 4 — if location is denied/unavailable, no marker is drawn at all (a fake "you are here" pin would be worse than none)
   - Real risk-zone circles, drawn from the same `GET /predictions` data, coloured by actual severity, radius from the actual `radiusMetres` field
   - Shelter/hospital markers — **still demonstration data** (`DEMO_SHELTERS`/`DEMO_HOSPITALS` hard-coded arrays), clearly commented as such, because there's no `/shelters` or `/hospitals` endpoint yet — that's Phase 7/8, once there's a ShelterOperator/HospitalOperator role actually managing that data
   - A real legend matching the design tokens

5. **`BottomNav`** now actually navigates (`Home` → `/`, `Map` → `/map`, `Queue` → `/offline`) using real Next.js routing and highlights the active tab from the real URL — it was decorative until this phase.

## What's still not real / deferred (on purpose)

- **No actual ML model** — `isDemonstrationData` is `true` for every row that exists, and always will be until a real prediction pipeline exists to replace the seed script. The API shape is what a real model's output would populate, so swapping it in later doesn't change any frontend code.
- **Shelters/hospitals on the map are still hard-coded**, not from a database — flagged clearly in code comments rather than silently left as-is.
- **SOS and Alerts nav tabs still point at Home** — there's no dedicated SOS route (it lives inline on Home) and no Alerts screen has been built as real code yet.
- **Risk zones are circles, not polygons** — a real flood boundary isn't a perfect circle, but full GeoJSON polygon support is deferred until there's a real GIS data source shaped that way to justify it.
- **No test run in this environment** — same standing caveat: no network access here to install `leaflet`/`react-leaflet` or run Postgres. Manual test steps below.

## How to test this yourself

```bash
# terminal 1 — backend
cd services/api
npm install
npx prisma migrate dev --name add_predictions
npm run prisma:seed
npm run start:dev

# terminal 2 — frontend
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000 — Home's risk cards should now show the seeded flood/rain/heatwave data (not hard-coded). Tap **Map** in the bottom nav — you should get a real, pannable/zoomable OpenStreetMap view with an amber flood-risk circle over Poonamallee and shelter/hospital pins.

## Next step: Phase 7

Volunteer and rescue workflows — the first screens for a second user role, and the first real use of the `UserRole` RBAC foundation from Phase 3 beyond just gating the SOS detail endpoint.
