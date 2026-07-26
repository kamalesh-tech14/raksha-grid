# Raksha Grid — AI Disaster Intelligence & Emergency Response Platform

# Raksha Grid — AI Disaster Intelligence & Emergency Response Platform

- **Phase 1** (product definition, architecture plan) — `docs/PHASE-1-PRODUCT-DEFINITION.md`
- **Phase 2** (design system + wireframes, approved) — `docs/PHASE-2-DESIGN-SYSTEM.md`
- **Phase 3** (repo architecture, database, API contracts, auth foundation) — `docs/PHASE-3-ARCHITECTURE.md` ← **start here**, it explains what's real vs. stubbed in this codebase right now.

## Repo shape (npm workspaces monorepo, since Phase 3)

```
apps/web/            Next.js PWA — civilian app + (later) command dashboard
services/api/         NestJS backend — auth, SOS incidents, Prisma/PostGIS schema
packages/shared-types/  TypeScript types shared by web + api
docs/                  the phase documents
.claude/skills/        the project-specific Claude skill
```

## Run the frontend (view-only prototype, works today)

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000 in a narrow/mobile viewport.

## Run the backend (needs a Postgres+PostGIS instance you provide)

```bash
cd services/api
cp .env.example .env   # fill in a real DATABASE_URL and JWT secrets
npm install
npx prisma migrate dev --name init
# then manually run the PostGIS step described in
# prisma/migrations/00000000000000_init/migration.sql
npm run start:dev
```

**Nothing here has been run end-to-end in this environment** — no network access to install packages or start a database. Do a local sanity check before building further on top of it; see `docs/PHASE-3-ARCHITECTURE.md` §6 for the exact list of what's real code vs. still stubbed.

## Next step: Phase 4

Wire the approved Phase 2 Home screen up to the real `POST /sos` and `GET /sos/:id` endpoints from Phase 3.

