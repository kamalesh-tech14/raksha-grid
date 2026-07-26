# Raksha Grid — Phase 2: Design System & Wireframes

Direction locked from the brief: premium dark disaster-command interface, deep navy/charcoal base, cyan/electric-blue for normal data, amber for warnings, red reserved only for danger/SOS, green for verified success — restrained glass, calm during emergencies, no decoration that doesn't carry meaning.

---

## 1. Design Tokens

### Colour

| Token | Hex | Use |
|---|---|---|
| `bg-void` | `#0A0F1C` | App background |
| `bg-surface` | `#111A2B` | Card / panel base |
| `bg-surface-raised` | `#17223A` | Elevated card, modal |
| `border-hairline` | `rgba(255,255,255,0.08)` | Card edges, dividers |
| `accent-cyan` | `#3AD1F2` | Live/normal data, links |
| `accent-electric` | `#4C7CFF` | Secondary data, charts |
| `warn-amber` | `#F2A93C` | Watch / warning severity |
| `danger-red` | `#FF4D5E` | Critical severity, SOS only |
| `success-green` | `#2ED9A0` | Delivered, resolved, verified |
| `text-primary` | `#F2F5FA` | Headlines, primary text |
| `text-muted` | `#8CA0C2` | Secondary text, captions |
| `text-disabled` | `#4B5A76` | Disabled, placeholder |

**Rule:** red never appears for anything except SOS controls and critical/danger states — this keeps it meaningful under stress. Colour is always paired with an icon + text label (accessibility requirement).

### Typography

- **Display — Space Grotesk** (headlines, the SOS wordmark, large stat numbers). Geometric and slightly technical — reads as instrumentation, not marketing.
- **Body — IBM Plex Sans** (all UI copy, buttons, cards). Excellent legibility at small mobile sizes.
- **Data/Mono — IBM Plex Mono** (GPS coordinates, timestamps, incident IDs, delivery-state logs). Shares DNA with Plex Sans so the pairing feels like one engineered family, and monospacing makes coordinate digits scannable at a glance — important when a responder is reading lat/long under pressure.

Scale (mobile base 16px): `display-xl` 32/38, `display-lg` 24/30, `title` 20/26, `body` 16/24, `caption` 13/18, `data` 14/20 (mono).

### Spacing & shape

- 4px base grid; primary paddings at 12 / 16 / 24.
- Cards: `rounded-2xl` (16px), hairline border, `bg-surface`, soft elevation shadow (`0 8px 24px rgba(0,0,0,0.35)`) — no heavy glass blur on scrolling content (performance rule); blur is reserved for modals/sheets only.
- Touch targets: minimum 44×44px, SOS button 88px diameter.

### Motion

- Page transitions: 200ms ease-out slide/fade, never bouncy.
- Status changes animate (e.g. delivery-state dot progressing) — decoration never animates on its own.
- Full `prefers-reduced-motion` support: all transitions collapse to instant/opacity-only.

### Signature element

**The Pulse Ring** — a breathing ring around the SOS button whose colour always reflects the *current highest regional risk severity* (cyan → amber → red), and whose animation freezes solid the instant SOS is pressed. One element does double duty: ambient risk awareness at all times, and unambiguous "your hold registered" feedback in the moment it matters most. This is the one bold, animated element in the whole system — everything else stays quiet.

---

## 2. Mobile Wireframes

### Home (civilian)

```
┌─────────────────────────┐
│ ≡  Raksha Grid      🔔3 │  status bar / header
├─────────────────────────┤
│ ⚠ FLOOD WATCH — Zone 4  │  active alert banner (amber)
│ Expires in 6h · details →│
├─────────────────────────┤
│  Risk Today              │
│ ┌─────┐┌─────┐┌─────┐   │  horiz. scroll risk cards
│ │Flood││Rain ││Heat │   │  (severity colour + %)
│ │ 62% ││ 40% ││ 18% │   │
│ └─────┘└─────┘└─────┘   │
├─────────────────────────┤
│      ( Pulse Ring )      │
│         SOS              │  dominant, thumb-reach,
│    hold 2–3s to send     │  centred above nav
├─────────────────────────┤
│ Nearby: 2 shelters open  │
│ 🏠 Community Hall  1.2km │
│ 🏥 City Hospital   2.4km │
├─────────────────────────┤
│ [Home] [Map] [SOS] [Alerts] [More] │  bottom nav
└─────────────────────────┘
```

### SOS Activation → Transmission Status

```
Hold state:                Status state:
┌───────────────┐          ┌───────────────┐
│   ◐ 2.4s...   │          │ SOS #A19F  P1 │
│  release to   │          │ ● Stored local │
│    cancel     │          │ ● Checking rte │
└───────────────┘          │ ○ Sending      │
                            │ ○ Delivered    │
                            │ ○ Acknowledged │
                            │ Last route: BT relay (sim) │
                            └───────────────┘
```

### Live Risk Map

```
┌─────────────────────────┐
│ [Layers ▾] [🕐 Time] [⌖]│
│                         │
│      (map canvas)       │
│   ▲you  🏠shelter  🏥   │
│   ▓▓ flood zone         │
│                         │
├─────────────────────────┤
│ Legend  ·  📶 Offline map cached 3h ago │
└─────────────────────────┘
```

### Alerts

```
┌─────────────────────────┐
│ Alerts                  │
│ ── CRITICAL ──           │
│ 🔴 Evacuate Zone 4 now   │
│ ── WARNING ──             │
│ 🟠 Flood watch, Zone 4   │
│ ── ADVISORY ──            │
│ 🔵 Heavy rain expected   │
└─────────────────────────┘
```

*(Remaining screens — Onboarding, Permissions, Disaster detail, Offline centre, Offline maps, Shelters/Hospitals, Guides, AI assistant, Family check-in, Profile, Comms status, Settings — follow the same card/list/hairline-divider language; full wireframes produced screen-by-screen as each is implemented in later phases, not duplicated here to keep this doc reviewable.)*

---

## 3. Interactive Prototype Plan

A working HTML prototype of the **Home screen** is included alongside this document (`mobile-home-screen-prototype.html`) — real tokens, real type, functioning bottom nav, and a press-and-hold SOS button with the Pulse Ring signature element, sized to a real mobile frame (390px). This is the reference implementation the Phase 4 build should match pixel-for-pixel.

Next prototype passes (only after this one is approved): SOS transmission-status screen, Risk map shell, Alerts list.

## 4. Demo Story (ties to Phase 9's full sequence)

For this phase, the story is simply: *open the app, see today's risk at a glance, know exactly where the one button that matters is, and never wonder what colour means what.* The full 16-step judge demonstration builds on top of this once SOS logic and the communication simulator exist (Phase 9).

---

## 5. v2 Update — Personalised Home Dashboard

Based on direct feedback, the Home screen is upgraded from a light overview into a fuller, data-rich personal safety dashboard — still mobile-first, still calm, still hierarchy-first. New pattern: **hero status → urgent alert → primary action → supporting data → nearby resources**, so the most decision-relevant thing is always above the fold, and everything else is a deliberate scroll, not clutter competing for the same glance.

### New/changed components

- **Greeting header** — "Good morning, {name}" (bright white, `#FFFFFF`, subtle glow — approved brighter than the default `text-primary` grey-white so the personal greeting pops as the very first thing read) + a `LIVE` sync pill with "synced Ns ago" (font-data, small, top-right).
- **Safety Status Hero** — the single biggest signal on the screen: a status pill (🟢 Safe / 🟠 Caution / 🔴 Danger), current locality ("📍 Chennai · Poonamallee"), and last-updated timestamp. This replaces a generic "welcome" hero — it answers the one question the user opens the app to ask.
- **AI Prediction card** — disaster type, probability %, a `HIGH RISK` / `MODERATE` / `LOW` severity pill, confidence %, expected time window, `DEMO DATA` badge, freshness timestamp. One card, not scattered numbers — probability and confidence sit side by side so they're never mistaken for each other.
- **Communication status row** — compact chip row: `Internet ❌` `GPS ✅` `SMS ❌` `Nearby Relay ✅`, plus current `Route:` and `Status:` (e.g. Bluetooth Relay / Queued). This is the ambient, always-visible sibling of the full Communication Simulator built in Phase 9 — same colour language (green = available, red/grey = unavailable), just condensed to a glanceable strip.
- **SOS quick-status chip** — only rendered when an SOS is active locally: a one-line collapsing timeline ("✓ SOS Stored → Finding route… → Bluetooth Relay… → Satellite (sim)…"), tap-through to the full SOS Transmission Status screen. Keeps the dashboard honest about an in-flight emergency without forcing a screen switch.
- **Weather strip** — temperature, condition, humidity, wind — small, single row, secondary to the AI Prediction card (weather is context, not the warning itself). Directly attached below it: a **heatwave risk row** (🌡️ risk pill, e.g. "Low · 18%"), using the same severity colour scale as everywhere else (green = low, amber = moderate, red = high) — so people always see current weather *and* whether it's trending toward a heat emergency, without needing to open the full risk-intelligence screen.
- **Nearby resource cards** — Shelter (distance, capacity fraction, open/closed) and Hospital (distance, emergency-bed count, availability), same card shape as the existing Home nearby list, now carrying real structured fields instead of a single line.

### Why this ordering (not just "add more cards")

Hero status and the active alert stay first because they're the two things a person in an actual event needs in under two seconds. The SOS button stays reachable immediately after — it never gets pushed down by the new data. Everything data-dense (AI prediction detail, comms chips, weather, resources) is deliberately *below* the action, so the dashboard feels informative on a calm day and still fast to act on during an emergency.

### Updated wireframe

```
┌─────────────────────────┐
│ Good morning, Pradeeksha │
│                  ● LIVE · synced 12s ago │
├─────────────────────────┤
│  🟢 Safe                 │
│  📍 Chennai · Poonamallee │
│  Last updated 12s ago    │
├─────────────────────────┤
│ ⚠ Flood Watch — exp. 6h  │
│ Tap for evacuation route→│
├─────────────────────────┤
│      ( Pulse Ring )      │
│         SOS              │
│    hold 2–3s to send     │
├─────────────────────────┤
│ Internet❌ GPS✅ SMS❌ Relay✅│
│ Route: Bluetooth Relay · Queued │
├─────────────────────────┤
│ AI Prediction  [DEMO DATA]│
│ Flood 62% · HIGH RISK     │
│ Confidence 91% · within 5h│
│ updated 12s ago           │
├─────────────────────────┤
│ 28°C Heavy Rain           │
│ Humidity 84% · Wind 32km/h│
├─────────────────────────┤
│ 🏠 Shelter  1.2km  120/300 Open │
│ 🏥 Hospital 2.4km  18 beds Available │
├─────────────────────────┤
│ [Home][Map][SOS][Alerts][More] │
└─────────────────────────┘
```

### Approval checkpoint

This is Phase 2. Please review the tokens, wireframes, and the attached interactive Home screen prototype. On approval, Phase 3 (repository architecture, database schema, API contracts, shared types, auth foundation) starts next.
