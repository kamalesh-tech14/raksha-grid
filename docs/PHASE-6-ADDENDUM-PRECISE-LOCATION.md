# Phase 6 addendum — Precise Location & Real Reverse Geocoding

Triggered by a real bug report: location silently wasn't showing, with no explanation why. Fixed in both the demo file and the real codebase.

## Root cause

`captureLocation()`'s geolocation error handler was intentionally silent — correct for its actual purpose (never blocking SOS creation on GPS failing), but wrong for a UI context like the map, where a person needs to know *why* nothing showed up.

## Fix

**`lib/geolocation.ts`** — added `getPreciseLocation()`, a separate function from `captureLocation()`. It rejects with the real, specific `GeolocationPositionError` reason (permission denied / position unavailable / timeout) with an actionable message, instead of resolving silently. `captureLocation()` itself is untouched — SOS creation still correctly never blocks on this.

**`lib/reverseGeocode.ts`** (new) — real reverse geocoding via OpenStreetMap's public Nominatim API. A genuine network call, not a lookup table. Returns road, area, city, state, country, postcode from your actual coordinates.

**`components/RiskMap.tsx`** — now shows:
- A visible status bar: "Requesting…" / "✅ Location found — accuracy ±Nm" / a specific error with an actionable fix
- A **"Find my location" button** you can press manually/retry, instead of only firing once automatically on page load
- A real **accuracy circle** on the map — its radius is the actual GPS accuracy reading, so a wide circle honestly means a weak fix, not a bug
- A real **address card** below the map: street/road name, area, city/state/country, postcode, exact lat/lng to 6 decimal places, all from the live reverse-geocode call

**`app-prototype-v4.html`** — same fix applied to the standalone demo file, so both stay consistent.

## If location still doesn't show

This is real browser behavior, not something the code can bypass:

1. **Check the permission prompt** — it appears near the address bar. If you don't see one, click the 🔒/ⓘ icon left of the address bar → Site settings → Location → Allow.
2. **Check your OS-level location toggle** — separate from the browser.
3. **`file://` URLs sometimes block geolocation in Chrome** depending on settings — if no permission prompt ever appears, this is likely why. Fix: serve the app over `http://localhost` instead (`npm run dev` already does this for the real app).

## Nominatim usage note

The reverse-geocoding calls hit OpenStreetMap's free public Nominatim service, capped at roughly 1 request/second for unauthenticated use — fine for "look up address once after a GPS fix," not fine for high-volume production traffic. If this app needed that scale later, the fix is a paid geocoding provider with an API key, not something to fake in the meantime.
