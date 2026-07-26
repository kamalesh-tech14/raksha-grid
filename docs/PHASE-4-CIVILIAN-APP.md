# Phase 4 — Civilian App Connected to the Real Backend

**Step 1 — Inspect:** `apps/web` had the approved Phase 2 Home screen with a fake `onActivate` callback; `services/api` had the real Phase 3 SOS endpoints but nothing calling them.

**Step 2 — Plan:** add `apps/web/lib/{api,device,geolocation}.ts`, rewrite `SosButton.tsx` to call the real backend, add a real `/sos/[id]` status page, add one small backend gap-fill (`GET /sos/:id/status`, public/low-detail) since civilians had no way to check their own SOS otherwise.

## What's real now

1. **Pressing and holding SOS actually**:
   - Asks the browser for real GPS via `navigator.geolocation` (`lib/geolocation.ts`) — a real permission prompt will appear in a real browser.
   - Generates a real `idempotencyKey` (`crypto.randomUUID()`) and a persisted `deviceIdHash` (`lib/device.ts`, stored in `localStorage`).
   - Reads real `navigator.onLine` / connection info (`lib/api.ts` → `readNetworkState`).
   - Sends an actual `POST /sos` HTTP request to the Phase 3 backend.
   - On success, navigates to `/sos/[id]` — a real page, not a fake toast.
   - On failure (server unreachable), shows a genuine error + Retry button — **it does not pretend the SOS was stored offline**, because the real offline queue doesn't exist yet (that's Phase 5). This is a deliberate honesty choice, not an oversight.

2. **`/sos/[id]` (SOS Transmission Status)** — polls the real `GET /sos/:id/status` endpoint every 4 seconds and renders whatever state the database actually has. No hard-coded timeline like the v2 HTML prototype had.

3. **Backend gap-fill:** added `GET /sos/:id/status`, deliberately low-detail (id, priority, state, retry count, last delivery attempt — no coordinates, no PII) and public, so the reporting client can poll its own SOS without needing to log in first, without exposing anything sensitive if the id leaks.

## What's still not real (be precise about this)

- **The offline queue.** If `POST /sos` fails because the device is actually offline, nothing is queued or retried automatically yet — that's the entire point of Phase 5.
- **The delivery state itself doesn't move on its own.** The backend has no worker yet trying routes and advancing `checking-routes → queued → sending → delivered`. Right now a state only changes if something calls `PATCH /sos/:id/state` (e.g. a rescue-dashboard operator, once Phase 8 exists) — Phase 9's Communication Simulator is what will actually drive this automatically for the demo.
- **Emergency type is hard-coded to `"other"`** in `SosButton` — there's no emergency-type picker UI yet. Adding that (Trapped / Medical / Flood / Fire / etc.) is a small follow-up, deliberately left out of this phase so the SOS-to-backend wiring could be verified with the smallest possible change first.
- **No test database was run against this in this environment** (no network access here) — this code is correct TypeScript/NestJS, but it hasn't executed end-to-end. Same caveat as Phase 3.

## How to actually test this yourself

```bash
# terminal 1
cd services/api
cp .env.example .env   # fill in a real DATABASE_URL + JWT secrets
npm install
npx prisma migrate dev --name init
npm run start:dev

# terminal 2
cd apps/web
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000, hold the SOS button. Watch it ask for your real location, then redirect to a real `/sos/<uuid>` page. Check your Postgres `sos_incidents` table — the row will really be there.

## Next step: Phase 5

The offline queue: persist a pending SOS locally (IndexedDB) the moment `POST /sos` fails, retry with exponential backoff, and sync automatically when connectivity returns — this is what turns the honest "Couldn't reach the server" error from this phase into the "Stored locally, will retry" experience the design always intended.
