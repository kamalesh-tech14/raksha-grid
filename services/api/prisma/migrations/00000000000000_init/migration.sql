-- This file is a placeholder describing the migration workflow, not a
-- ready-to-run migration — Prisma can generate the rest of the schema
-- automatically, but the PostGIS extension + geography column need one
-- manual step because Prisma has no native geography type.
--
-- Real workflow once a database is available:
--   1. npx prisma migrate dev --name init   (creates users, sos_incidents, etc.
--      with `location` as a placeholder/omitted column)
--   2. Run this manually against the same database:

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "sos_incidents"
  ADD COLUMN IF NOT EXISTS "location" geography(Point, 4326);

CREATE INDEX IF NOT EXISTS "sos_incidents_location_idx"
  ON "sos_incidents" USING GIST ("location");

--   3. From then on, prisma/schema.prisma already declares `location` as
--      Unsupported("geography(Point, 4326)") so future `prisma migrate dev`
--      runs leave this column alone instead of trying to manage it.
