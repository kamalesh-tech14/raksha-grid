# AI Disaster Intelligence & Emergency Response Platform
### Phase 1 — Product Definition, Architecture Plan & Roadmap

**Status check (first action per skill):** no application repository exists yet — only the `disaster-platform-developer` skill package. This document is the Phase 1 deliverable required before any application code is written. Nothing below is implemented yet; all diagrams and models are the plan we'll build against.

---

## 1. Improved Product Definition

A mobile-first **disaster-response operating system** — not a weather app, not a form. It has four operating modes that all share one data model:

- **Predict** — AI risk intelligence surfaces danger before it arrives.
- **Warn** — role-targeted alerts reach civilians, volunteers, and command centres.
- **Report** — a resilient SOS pipeline captures and queues emergencies even with zero connectivity.
- **Coordinate** — volunteers, hospitals, shelters, and government operators work one shared incident queue in real time.

The platform is explicit, everywhere, about the line between **live**, **simulated**, and **future-hardware-dependent** functionality — this honesty is a competition-judge-facing feature, not an afterthought.

## 2. Product Name Suggestions

Working name until finalised: **Raksha Grid** *("raksha" = protection, "grid" = the mesh of people/devices/gateways)*.

Alternatives: **Setu** (bridge — relay/gateway theme), **Prahari** (sentinel/watcher), **Kavach OS** (shield operating system), **Sanchar Setu** (communication bridge).

Logo concept: a radiating signal/beacon mark — concentric arcs breaking into a route-line that terminates in a shield, working in both a full lockup and a single-glyph app icon.

## 3. Core Value Proposition

> "When towers go down, Raksha Grid doesn't stop listening — it stores, relays, and gets your location to someone who can help, the moment any path opens."

Differentiator vs. typical disaster apps: most assume connectivity. This platform assumes it will be *lost* and is architected around graceful degradation, not as an edge case but as the primary design constraint.

## 4. User Roles

| Role | Primary need | Sensitive-data access |
|---|---|---|
| Civilian | Get warned, send SOS, find safety | Own data only |
| Volunteer | Accept nearby missions | Approximate location until mission accepted |
| Rescue team | Navigate to and resolve incidents | Full incident detail once assigned |
| Hospital operator | Update capacity, receive transfers | Patient-relevant fields only |
| Shelter operator | Update occupancy/resources | Shelter data only |
| NGO coordinator | Cross-incident resource view | Aggregated, anonymised by default |
| Government control-room operator | Region-wide command | Full access, audited |
| Administrator | Platform config, user/role management | Full access, audited |

## 5. Full Feature Map

- **Risk intelligence:** flood/cyclone/heatwave/wildfire/landslide/rainfall/waterlogging/storm-surge/air-quality/earthquake-feed cards, explainability panel, historical comparison, preparedness checklist.
- **Live risk map:** layered GIS (zones, shelters, hospitals, road closures, SOS markers, gateways), time slider, offline download regions, accessible list view.
- **Smart SOS:** press-and-hold activation, silent mode, full payload capture, 12-state delivery pipeline, priority classification (P1–P4).
- **Offline mode:** cached guides, offline maps, local SOS queue, first-aid/CPR/evacuation content, flashlight/compass/alarm, emergency QR export.
- **Communication engine:** provider-adapter routing across internet/SMS/Bluetooth relay/Wi-Fi Direct/LoRa/satellite, with dedup and idempotency.
- **Volunteer network:** mission accept/decline, offline navigation, status updates, backup/medical requests.
- **Command dashboard:** live incident map, priority queue, dispatch, resource allocation, audit log.
- **Hospital & shelter system:** live capacity/resource updates, safest-destination matching.
- **AI emergency assistant:** first-aid/CPR/evacuation guidance, online vs. offline-verified distinction, TTS + multilingual architecture.
- **Alerts:** five-tier severity, full provenance (issuer, area, expiry, verification).
- **Demo mode + "How It Works" transparency panel** for judges.

## 6. MVP Features (build first)

1. Civilian home + onboarding + permissions
2. SOS activation → local storage → delivery-state UI (internet-only route first)
3. Live risk map with mock risk polygons + shelters/hospitals
4. Basic rescue dashboard: incident queue + map + assign
5. Auth + RBAC foundation
6. Offline PWA shell + IndexedDB SOS queue

## 7. Competition-Demo Features (build second)

7. Communication Simulator (toggle internet/SMS/relay/LoRa/satellite)
8. Mock LoRa + satellite adapters with visible route timeline
9. Volunteer mission accept flow
10. AI risk explainability panel + "Why this warning?"
11. Guided 16-step demo mode + "How It Works" panel
12. Hospital/shelter live-update screens

## 8. Future Hardware Features (roadmap only, not built now)

- Real LoRa community gateway hardware (solar, siren, beacon, sensors)
- Authorised satellite IoT/broadband provider integration
- Government emergency-gateway integration
- Biometric auth on native mobile
- Real push-based background sync on iOS (subject to OS constraints)

## 9. System Architecture (high level)

```
┌────────────────────────┐     ┌────────────────────────┐
│   Civilian PWA/Mobile   │     │  Command Dashboard (web) │
│  (Next.js / Expo RN)    │     │       (Next.js)          │
└──────────┬──────────────┘     └───────────┬──────────────┘
           │ REST + WebSocket/SSE            │
           ▼                                 ▼
┌─────────────────────────────────────────────────────┐
│              Backend API (Node.js / NestJS)          │
│  Auth · SOS · Incidents · Alerts · Volunteers · RBAC │
└───────┬───────────────┬───────────────┬──────────────┘
        │               │               │
        ▼               ▼               ▼
 ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐
 │ PostgreSQL/  │ │ Redis (queue/│ │ Python ML service │
 │ PostGIS      │ │  cache)      │ │ (risk prediction)  │
 └─────────────┘ └──────────────┘ └─────────────────┘
        ▲
        │
┌───────┴────────────────────────────────────────────┐
│      Communication Adapter Layer (provider-adapter) │
│  Internet | SMS | BT-relay | WiFi-Direct | LoRa(mock)│
│                    | Satellite (mock)                │
└───────────────────────────────────────────────────────┘
```

## 10. Communication-Flow Diagram (worst-case path)

```
GPS acquired (device)
   → Stored locally (IndexedDB / secure mobile store)
   → Internet check: unavailable
   → SMS check: unavailable
   → Nearby Bluetooth relay: discovered [prototype simulation]
   → Relay reaches LoRa gateway [prototype simulation]
   → LoRa gateway forwards to satellite adapter [prototype simulation]
   → Backend receives via mock satellite webhook
   → Rescue dashboard shows new P1 incident
   → Operator sends acknowledgement
   → Acknowledgement flows back down the same route
   → Civilian app shows "Acknowledged"
```

## 11. SOS State Machine

```
draft → collecting-location → stored-locally → checking-routes
   → queued → sending → relay-transferred → delivered
   → acknowledged → rescue-assigned → help-approaching → resolved

  (from any post-stored-locally state, on failure)
   → retry-scheduled → (back into checking-routes)
   → failed (only after retry budget exhausted; SOS remains stored-locally)
```

(Full type definitions live in the skill's `references/product-requirements.md`.)

## 12. Database Entity Plan (high level)

`users`, `roles`, `profiles`, `medical_profiles`, `devices`, `sos_incidents`, `incident_updates`, `location_samples`, `delivery_attempts`, `communication_routes`, `volunteers`, `rescue_teams`, `missions`, `hospitals`, `shelters`, `resources`, `disaster_predictions`, `alerts`, `map_layers`, `gateways`, `gateway_health`, `satellite_messages`, `lora_messages`, `audit_logs`, `notifications`, `offline_sync_records`.

PostGIS geography columns on `location_samples`, `sos_incidents`, `hospitals`, `shelters`, `gateways` for spatial queries (nearest-shelter, geofenced alerts, responder distance sort).

## 13. API Module Plan

`/auth` · `/users` · `/sos` (create/update/status/ack) · `/incidents` · `/predictions` · `/alerts` · `/map/layers` · `/volunteers` · `/missions` · `/hospitals` · `/shelters` · `/resources` · `/gateways` · `/comm-sim` (dev/demo only) · `/audit`. WebSocket/SSE channel for live incident + dashboard updates.

## 14. Folder Structure (proposed monorepo)

```
raksha-grid/
├── apps/
│   ├── web/              # Next.js PWA — civilian + command dashboard
│   └── mobile/           # Expo React Native
├── services/
│   ├── api/               # NestJS backend
│   └── ml-risk/           # Python prediction service
├── packages/
│   ├── shared-types/      # SosPayload, NetworkState, etc.
│   ├── ui/                 # shared design-system components
│   └── comm-adapters/      # provider-adapter interfaces + mock impls
├── .claude/skills/disaster-platform-developer/
└── infra/                 # IaC, CI/CD, docker
```

## 15. Mobile Screen List

Onboarding · Permission setup · Home · Risk Map · Disaster detail · Alerts · SOS activation · SOS form · SOS transmission status · Offline emergency centre · Offline maps · Shelters & hospitals · Emergency guides · AI assistant · Family check-in · Profile/medical profile · Communication status · Settings/accessibility.

## 16. Command-Dashboard Screen List

Login/RBAC gate · Live incident map · Priority queue · Incident detail/timeline · Responder assignment · Volunteers · Hospitals · Shelters · Resources/vehicles · Road closures · Communication & gateway status · Delivery failures · Audit log · Communication Simulator (demo) · Reports/export.

## 17. Security Strategy

JWT + refresh-token rotation, RBAC + attribute-based field restrictions (exact coordinates gated to assigned responders), encryption in transit/at rest, encrypted local emergency storage, rate limiting + anti-spam on SOS creation, idempotency keys, device registration, full audit logging on sensitive actions, no secrets in frontend, data minimisation + retention policy, consent management.

## 18. Offline Strategy

PWA install + service-worker app-shell cache; IndexedDB SOS queue with retry/exponential backoff and survive-restart guarantee; downloadable offline map regions; cached shelter/hospital snapshots with freshness timestamps; offline-verified emergency-guide content distinct from online AI answers; low-data and low-battery modes.

## 19. Demo Scenario

The 16-step guided sequence and exact judge-facing "How It Works" answers are already codified in the skill's `references/demo-scenarios.md` — reuse verbatim during Phase 9 build-out and the actual competition run.

## 20. Development Roadmap

Phases 1–10 exactly as defined in the skill (`SKILL.md`): product definition → design system/wireframes → foundation/schema/API → civilian mobile app → SOS + offline queue → risk map → volunteer workflows → command dashboard → communication simulator + mock adapters → security/accessibility/performance/tests/deployment.

---

### Next step

Per the skill's own instruction ("after presenting these, begin implementation with the design system and mobile home screen"), Phase 2 starts with the design system (tokens, components) and the civilian Home screen — the first real code in the repo.
