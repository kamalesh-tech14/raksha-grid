# Phase 3 — Repository Architecture, Database, API Contracts, Auth Foundation

**Step 1 — Inspect (done):** the repo had only `apps/web` (the Next.js prototype from Phase 2). This phase restructures it into a small monorepo and adds the first real backend code.

**Step 2 — Plan**

- Files added: `services/api/**` (NestJS backend), `packages/shared-types/**`, root `package.json` (npm workspaces), this doc.
- Files moved: `app/`, `components/`, `public/`, and the Next.js config files → `apps/web/`.
- Data model changes: new — see §2 below.
- API changes: new — see §3 below.
- Offline implications: the `idempotencyKey` + explicit state machine on `SosIncident` are what let a client retry a queued/offline SOS safely without creating duplicates once it reconnects (Phase 5 wires the actual offline queue into this).
- Security implications: RBAC via `RolesGuard` reading only the verified JWT payload; refresh-token rotation with reuse detection; exact SOS detail gated to responder roles; passwords/refresh tokens stored hashed, never plaintext.
- Testing plan: unit tests on the priority-suggestion stub now; state-machine and auth integration tests once a test database is available (flagged, not skipped — see §5).
- Simulated parts: none of this phase is simulated — it's real (if minimal) backend logic. What's still missing is a running Postgres instance, so nothing here has been executed end-to-end yet (see §6 "What's not done").

---

## 1. Repository structure (implemented)

```
raksha-grid/
├── apps/
│   └── web/                    # Next.js PWA (moved from repo root)
├── services/
│   └── api/                    # NestJS backend
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/00000000000000_init/migration.sql
│       └── src/
│           ├── auth/           # login, refresh rotation, RBAC
│           ├── sos/            # create/read/transition SOS incidents
│           ├── app.module.ts
│           ├── main.ts
│           └── prisma.service.ts
├── packages/
│   └── shared-types/           # SosPayload, NetworkState, DisasterRiskPrediction, AuthUser...
├── docs/
├── .claude/skills/disaster-platform-developer/
└── package.json                 # npm workspaces root
```

`apps/mobile` (Expo) and `services/ml-risk` (Python) from the original Phase 1 plan are intentionally not scaffolded yet — nothing in Phase 3–5 needs them, and empty placeholder folders would just be noise.

## 2. Database schema (implemented, not yet migrated to a live DB)

`services/api/prisma/schema.prisma` models exactly what Phase 3 needs: `User`, `RefreshToken`, `Device`, `SosIncident`, `IncidentUpdate` (audit trail of state/priority changes), `DeliveryAttempt` (one row per attempted communication route), `AuditLog`.

Not modelled yet, on purpose: `volunteers`, `missions`, `hospitals`, `shelters`, `resources`, `disaster_predictions`, `alerts`, `gateways`, `satellite_messages`, `lora_messages` — these get added in Phase 7/8/9 alongside the features that actually use them, per the skill's "preserve working architecture, don't build ahead of features" rule.

**PostGIS note:** `SosIncident.location` is `Unsupported("geography(Point, 4326)")` because Prisma has no native geography type. The extension + column are created by raw SQL in `migrations/00000000000000_init/migration.sql`, and all writes to it go through `$executeRaw` in `SosService.create()`.

## 3. API contracts (implemented)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/login` | none | email+password → `AuthTokenPair` |
| POST | `/auth/refresh` | refresh token in body | rotates refresh token, returns new pair |
| POST | `/auth/logout` | refresh token in body | revokes the whole session family |
| POST | `/sos` | none (emergency reports are never login-gated) | create an SOS incident, idempotent on `idempotencyKey` |
| GET | `/sos` | JWT + role (rescue-team/government-operator/administrator) | priority-sorted incident queue |
| GET | `/sos/:id` | JWT + role | full incident detail, including location |
| PATCH | `/sos/:id/state` | JWT + role | move an incident through its delivery-state machine |

Request/response bodies use the shared types in `packages/shared-types` — `CreateSosDto` in the backend is a runtime-validated mirror of `CreateSosRequest`, so frontend and backend can't silently drift apart.

Not built yet: `/incidents`, `/predictions`, `/alerts`, `/map/layers`, `/volunteers`, `/missions`, `/hospitals`, `/shelters`, `/resources`, `/gateways`, `/comm-sim`, `/audit`, and the WebSocket/SSE channel — these arrive with the phases that need them.

## 4. Auth strategy

- **Access tokens:** short-lived (15 min) JWTs, verified by `JwtStrategy` / `JwtAuthGuard`.
- **Refresh tokens:** opaque random strings (not JWTs), stored **hashed** in `refresh_tokens`, 30-day expiry, **rotated on every use**. Each token belongs to a `familyId`; if a token that's already been rotated is presented again, the whole family is revoked — this is the standard defence against a stolen refresh token being replayed after the legitimate user has already moved on to the next one.
- **RBAC:** `RolesGuard` reads the role only from the verified JWT payload attached by `JwtAuthGuard` — never from anything the client sends directly, per the "never trust client-provided roles" rule.
- **Passwords:** hashed with argon2 (`argon2.verify` in `AuthService.validateCredentials`); no plaintext ever touches the database or logs.

## 5. Testing plan

Implemented now: `services/api/test/priority.util.spec.ts` — unit tests for the priority-suggestion stub (pure function, no DB needed).

Deferred, and why: SOS-service tests (idempotent create, illegal-transition rejection) and auth tests (refresh rotation, reuse detection) need a real or in-memory Postgres instance to run against Prisma. This environment has no network access to spin one up, so those are written as a documented plan here rather than faked with a mock that would prove nothing:

- `SosService.create` called twice with the same `idempotencyKey` returns the same incident, doesn't create a second row.
- `SosService.transition` rejects an illegal jump (e.g. `draft` → `resolved`) with `BadRequestException`.
- `AuthService.rotateRefreshToken` called twice with the same (already-rotated) token revokes the whole family and both calls after that fail.
- Login with wrong password returns 401, doesn't leak whether the email exists.

## 6. What's not done (be honest about it)

- No live database — nothing in this phase has actually run against Postgres. `npm install` + `prisma migrate dev` + a real `DATABASE_URL` are needed before any of it executes.
- `deviceId` resolution in `SosController.create` is stubbed (`req.deviceId ?? dto.deviceIdHash`) — real device registration/lookup is a small `DevicesService`, intentionally deferred so this phase's SOS contract isn't blocked on it.
- Ownership check ("only the reporting user's own device can read their own incident") is not yet enforced on `GET /sos/:id` — only the responder-role path is. Full authorisation logic lands with Phase 5's offline queue, once there's a real client to authorise against.
- No rate limiting / anti-spam on `POST /sos` yet — flagged in the skill's security rules, scheduled for Phase 10 hardening rather than half-built here.

## 7. Next step: Phase 4

Mobile-first civilian application — wiring the already-approved Phase 2 Home screen up to real data: calling `POST /sos` from `SosButton`, and reading `GET /sos/:id` for the SOS Transmission Status screen. This is also where `apps/web` starts actually importing `@raksha-grid/shared-types` instead of just having it sit next to it in the monorepo.
