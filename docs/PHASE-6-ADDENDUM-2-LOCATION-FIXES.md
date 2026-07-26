# Phase 6 addendum 2 — Bug Fix + Consistency Fix + Honest Last-Resort Fallback

## What triggered this

Two things: (1) a real accuracy report — GPS showing Mannarkudi as "Mappedu," ~250km off — and (2) a request to add local-network/offline fallback options and Google Maps backend verification.

## 1. Real bug fixed: broken code in `lib/api.ts`

Found `getPredictions` and `readNetworkState` with **missing function declarations** — their bodies existed but the `export async function getPredictions(...) {` and `export function readNetworkState() {` lines themselves were gone, meaning the file would not have compiled. Restored both. Verified every `.ts`/`.tsx` file in both `apps/web` and `services/api` for brace-balance as a sanity sweep — everything else was fine.

## 2. Consistency fix: Home screen was behind Map screen

`RiskMap.tsx` (Map screen) already had, from earlier work: `getBestLocation()` (watches multiple GPS readings for several seconds and keeps the best one, instead of trusting a possibly-bad first fix), `reverseGeocodeVerified()` (cross-checks Nominatim against a second independent geocoder, BigDataCloud, and flags "sources disagree"), a manual place-search box, and tap-the-map-to-correct.

`SafetyStatusHero.tsx` (Home screen) was still on the older single-shot `getPreciseLocation()` + single geocoder — meaning Home could still show a wrong city even after Map was fixed. Rewired Home to use the exact same `getBestLocation()` + `reverseGeocodeVerified()` functions, and added a "sources disagree → verify or correct on the map" link when the two geocoders don't match.

## 3. Real IP-based fallback — added honestly, as a last resort only

New: `lib/ipLocation.ts`, using ipapi.co (free, no key). This is **not** WiFi-router positioning (browsers block websites from reading real WiFi signals — a security wall, not a limitation of this project) and **not** real GPS. It's "which city does this internet connection route through," which is exactly the kind of signal that produced the original Mannarkudi/Mappedu gap when it happens on its own.

**Where it's used:** only after `getBestLocation()` fails completely (permission denied, no GPS hardware, or times out with zero fix). It is never tried first, and never presented as confident:
- Marker changes from a confident 📍 cyan pin to a ❓ amber pin
- A wide dashed amber circle (30km radius) instead of a real accuracy circle
- Status text explicitly says "rough network-based guess only... could be hundreds of km off"
- Points directly at the search box / tap-to-set tools for correction

Applied in both the real app (`RiskMap.tsx`) and the standalone demo file (`app-prototype-v6.html`), including the Home hero's failure path linking over to Map's fuller toolkit.

## 4. Google Maps backend verification — needs something from you

Not built, on purpose: Google's Geocoding API requires a real API key tied to a billing account. I can't generate one. If you want it added as an alternative/third geocoder alongside Nominatim + BigDataCloud, get a key from Google Cloud Console and I'll wire it into `reverseGeocodeVerified()` — it's a small, contained addition once the key exists.

## Honest summary of the location system as it stands

Best → worst, in the actual order the code tries them:
1. **Real GPS**, watched for up to 8s for the best available fix (±5-30m typically, on a phone outdoors)
2. **Manual search** or **tap-to-set** — always available, always accurate, the standard fallback every real navigation app uses
3. **IP-based guess** — only after #1 fails, always visually and textually marked as unreliable, city-level at best

Nothing in this pipeline claims false precision. Where two geocoders disagree, that's surfaced, not hidden.
