// Raw DDL mirroring `schema/*.ts`, used only to bootstrap the local pglite
// dev fallback (see `createPgliteDb` in `index.ts`). Real deployments use
// `drizzle-kit push` against a real DATABASE_URL instead — this file exists
// purely so local development works without a provisioned Postgres instance.
export const pgliteBootstrapSql = `
DO $$ BEGIN
  CREATE TYPE brand_support AS ENUM ('full', 'chrome_only');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE draft_status AS ENUM ('draft', 'finalized');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending_payment');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text not null,
  thumbnail_url text,
  folder_path text not null,
  preview_base_path text,
  brand_support brand_support not null default 'chrome_only',
  default_primary_color text not null,
  default_secondary_color text not null,
  default_accent_color text not null,
  default_logo_url text,
  default_heading text not null,
  price_cents integer not null,
  created_at timestamp not null default now()
);

CREATE TABLE IF NOT EXISTS branding_drafts (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id),
  draft_token text not null,
  primary_color text not null,
  secondary_color text not null,
  accent_color text not null,
  logo_data_url text,
  bg_data_url text,
  font_data_url text,
  heading text not null,
  tagline text,
  status draft_status not null default 'draft',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- CREATE TABLE IF NOT EXISTS is a no-op against an already-bootstrapped local
-- database, so columns added after a dev machine's first run need an
-- explicit ALTER to actually show up.
ALTER TABLE branding_drafts ADD COLUMN IF NOT EXISTS bg_data_url text;
ALTER TABLE branding_drafts ADD COLUMN IF NOT EXISTS font_data_url text;

CREATE TABLE IF NOT EXISTS orders (
  id uuid primary key default gen_random_uuid(),
  branding_draft_id uuid not null references branding_drafts(id),
  game_id uuid not null references games(id),
  status order_status not null default 'pending_payment',
  total_amount_cents integer not null,
  contact_email text,
  created_at timestamp not null default now()
);

CREATE TABLE IF NOT EXISTS custom_ui_requests (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamp not null default now()
);

CREATE TABLE IF NOT EXISTS generations (
  id uuid primary key default gen_random_uuid(),
  scene_id text not null,
  scene_name text not null,
  visitor_name text,
  photo_status text not null default 'pending',
  video_status text not null default 'idle',
  photo_data text,
  photo_mime text,
  video_data text,
  video_mime text,
  video_request_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One shared table for every game's end-of-game "player info" form (all
-- games except Boat Booth) rather than a table per game — see
-- schema/player-submissions.ts for why.
CREATE TABLE IF NOT EXISTS player_submissions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id),
  order_id uuid references orders(id),
  name text not null,
  email text not null,
  extra jsonb,
  created_at timestamptz not null default now()
);
`;
