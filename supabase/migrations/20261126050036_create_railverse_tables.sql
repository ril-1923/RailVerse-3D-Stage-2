/*
# RailVerse 3D — persistence tables

1. New Tables
- `railverse_settings`
  - `id` (integer, primary key) — single row, always 1
  - `settings` (jsonb) — simulation settings: sound, volume, weather, timeOfDay
  - `updated_at` (timestamptz) — last write time
- `railverse_events`
  - `id` (bigserial, primary key)
  - `kind` (text) — event type: arrival / departure / warning
  - `text` (text) — human-readable announcement
  - `created_at` (timestamptz)

2. Security
- RLS enabled on both tables.
- Single-tenant, no sign-in app: policies target `anon, authenticated` and allow
  full CRUD because this data is intentionally shared/public operational state.
- Grants: SELECT/INSERT/UPDATE/DELETE to anon + authenticated; SELECT + INSERT
  on events (events are append-only from the app). Sequence grant for events id.
*/

CREATE TABLE IF NOT EXISTS railverse_settings (
  id integer PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS railverse_events (
  id bigserial PRIMARY KEY,
  kind text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE railverse_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE railverse_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON railverse_settings TO anon, authenticated;
GRANT SELECT, INSERT ON railverse_events TO anon, authenticated;
GRANT USAGE ON SEQUENCE railverse_events_id_seq TO anon, authenticated;

DROP POLICY IF EXISTS "Public read settings" ON railverse_settings;
CREATE POLICY "Public read settings"
ON railverse_settings FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public insert settings" ON railverse_settings;
CREATE POLICY "Public insert settings"
ON railverse_settings FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public update settings" ON railverse_settings;
CREATE POLICY "Public update settings"
ON railverse_settings FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete settings" ON railverse_settings;
CREATE POLICY "Public delete settings"
ON railverse_settings FOR DELETE
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read events" ON railverse_events;
CREATE POLICY "Public read events"
ON railverse_events FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public insert events" ON railverse_events;
CREATE POLICY "Public insert events"
ON railverse_events FOR INSERT
TO anon, authenticated WITH CHECK (true);
