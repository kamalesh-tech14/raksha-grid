# Phase 6 addendum 3 — Making More of the App Real

Triggered by: "make every option real, not demo — home, weather, SOS, map, location, route, everything."

## Scope check, honestly

Literally everything (volunteer network, rescue command dashboard, hospital/shelter operator tools, AI assistant, LoRa/satellite hardware, security hardening) is Phases 7-10 of the actual roadmap — each a real feature set on its own, not something to compress into one pass without cutting corners. What follows is what got made genuinely real in this pass, using only free services that need no API key from you.

## What's newly real

**Weather** (`lib/weather.ts`, `WeatherStrip.tsx`) — Open-Meteo, free, no key. Real current temperature/condition/humidity/wind for your actual GPS coordinates. Replaces the "28°C Heavy Rain" text that was hard-coded directly in the Phase 2 mockup and never touched since.

**Shelters & Hospitals** — new `Shelter` / `Hospital` Prisma tables, seeded with two of each, real `GET /shelters` / `GET /hospitals` endpoints. `NearbyResources.tsx` on Home now fetches these for real and computes real distance from your real location using the Haversine formula — not the hard-coded "1.2 km" / "2.4 km" strings that were sitting directly in `page.tsx` before. `RiskMap.tsx`'s markers use the same real data now (the `DEMO_SHELTERS`/`DEMO_HOSPITALS` arrays are gone).

**Alerts screen** (`app/alerts/page.tsx`) — a real page for the first time (it previously just pointed back at Home). Generated entirely from the real `GET /predictions` data, grouped into Critical/Warning/Advisory by actual severity, each entry showing real issuer, real expiry, real probability/confidence, and an honest `DEMO DATA` badge wherever `isDemonstrationData` is true. `BottomNav`'s Alerts tab now actually goes here.

**Top alert banner on Home** (`TopAlertBanner.tsx`) — replaces the hard-coded "Flood watch — Zone 4" text with the actual highest-severity active prediction, including a real "expires in Nh" calculated from the real `validUntil` timestamp.

**SOS emergency type** (`SosButton.tsx`) — a real picker (Trapped / Medical / Flood / Fire / Other) now sends the actual selected type instead of the hard-coded `"other"`. Kept as quick chips, not a form screen, per the "don't force long forms before storing the SOS" rule.

**Real bug fixed along the way:** removed the notification bell with a hard-coded "3" badge from the header — there's no real notification system behind it yet, and a fake unread count is exactly the kind of thing this project's honesty rules exist to prevent. It'll come back once notifications are real.

## Still explicitly not real (and why)

- **Volunteer/rescue/hospital-operator/shelter-operator interfaces** — Phase 7/8. The `Shelter`/`Hospital` tables exist now, but nothing lets an operator update their own occupancy/bed count live yet; that needs the operator role UI, not just a table.
- **AI emergency assistant** — Phase 9-adjacent, not started.
- **Communication Simulator / real LoRa / satellite adapters** — Phase 9, still just referenced in the skill docs, not built as code.
- **Notifications** — removed the fake badge rather than leave it; a real one needs a real trigger system (Phase 10 territory).
- **Google Maps geocoding** — still needs your own API key if you want it as a third verification source alongside Nominatim + BigDataCloud.

## How to test this yourself

```bash
cd services/api && npm install && npx prisma migrate dev --name add_shelters_hospitals && npm run prisma:seed && npm run start:dev
cd apps/web && npm install && npm run dev
```

Open Home — weather should show your real current conditions (assuming location permission granted), Nearby should show the two seeded shelters/hospitals with real distances, and the top banner should reflect the real seeded flood prediction. Tap Alerts in the bottom nav for the real grouped alert list.
