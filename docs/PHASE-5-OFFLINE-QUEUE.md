# Phase 5 — Offline Queue & Retry Engine

**Step 1 — Inspect:** Phase 4 left `SosButton` showing an honest error on network failure with no follow-up — this phase replaces that dead end with a real queue.

**Step 2 — Plan:** add `apps/web/lib/{offlineQueue,syncEngine}.ts`, rewire `SosButton`'s failure path, add a real `/offline` (Offline Emergency Centre) screen, add a `QueueBanner` on Home, and a minimal real service worker for app-shell caching.

## What's real now

1. **`lib/offlineQueue.ts`** — actual IndexedDB storage (not localStorage, not an in-memory array). A queued SOS survives page refresh, tab close, and browser restart, per the offline-first requirement. Keyed by the same `idempotencyKey` sent to the server, so a delayed-but-successful retry can never create a duplicate incident (backed by the server-side idempotency from Phase 3).

2. **`lib/syncEngine.ts`** — real exponential backoff (3s → 6s → 12s… capped at 60s, gives up after 8 attempts and marks the entry `failed` rather than retrying forever), a real `window.addEventListener("online", …)` trigger, and a 5-second foreground poll as a fallback. **Why not the Background Sync API:** its browser support is inconsistent (notably missing on iOS Safari), and the skill's own rule is "never suggest browser background execution is guaranteed on every platform" — this is the honest choice, not a shortcut.

3. **`SosButton`** — if `navigator.onLine` is already false, it skips the doomed network call and queues immediately. If the request fails for any other reason (server down, DNS, timeout), it queues then too. Either way it now says something true: "stored locally, will send automatically" — a claim backed by an actual IndexedDB row, not just a string.

4. **`/offline` (Offline Emergency Centre)** — lists every queued report with real status (`Waiting to retry` / `Sending…` / `Failed`), retry count, last error, and a manual "Retry now" button that calls the same sync engine.

5. **`QueueBanner`** on Home — shows a real live count of pending reports, pulled from IndexedDB, updates as the queue changes.

6. **A real (if minimal) service worker** (`public/sw.js`) — caches Home and the Offline Emergency Centre so they still load with zero connection, and falls back to the cached Home page for other failed navigations. Registered via `ServiceWorkerRegister` in the root layout.

## What's still not real / deferred (on purpose)

- **Offline maps, cached shelter/hospital data, offline first-aid guides** — listed as "coming in a later phase" directly in the Offline Emergency Centre UI rather than faked. These are Phase 6/10 work (they need real content and a real risk/shelter API to cache from).
- **Retry only runs while the tab is open** (foreground poll) or right when `online` fires. If the tab is fully closed while offline, nothing retries until it's reopened — this is stated plainly in `syncEngine.ts`'s comments and is a real, disclosed limitation, not hidden behind vague language.
- **Bottom nav's Map / Alerts / More still don't route anywhere** — unrelated to this phase, not expanded here to keep the diff focused on the offline queue itself.
- **No test run in this environment** — same caveat as every prior phase: no network access here to `npm install` and click through it. Manual test steps below.

## How to test this yourself

```bash
cd apps/web && npm install && npm run dev
```

1. Open http://localhost:3000, open DevTools → Network → set to "Offline"
2. Hold the SOS button — it should immediately say "stored locally, will send automatically" (no waiting for a timeout)
3. Go to `/offline` — see the entry with status "Waiting to retry"
4. Refresh the page — the entry is still there (this is the actual IndexedDB persistence working)
5. Set Network back to "Online" — within ~5s (or immediately, via the `online` event) it should disappear from the queue as it successfully posts to your locally running `services/api`

## Next step: Phase 6

Risk map and disaster-intelligence dashboard — replacing the hard-coded `RISKS` array on Home and the static map screen from the HTML prototype with a real (or clearly-labelled demonstration-data) prediction feed and an actual GIS map component.
