-- Reference tables (public read, no RLS)
CREATE TABLE regulations (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  short_name          TEXT NOT NULL,
  agency              TEXT NOT NULL,
  jurisdiction        TEXT NOT NULL,
  description         TEXT NOT NULL,
  applicable_services TEXT[]  DEFAULT '{}',
  processes           JSONB   DEFAULT '[]'
);

CREATE TABLE regulation_key_dates (
  id                   TEXT PRIMARY KEY,
  regulation_id        TEXT REFERENCES regulations(id),
  title                TEXT NOT NULL,
  description          TEXT,
  iso_date             TEXT NOT NULL,
  recurrence           TEXT NOT NULL DEFAULT 'annual',
  is_countdown_primary BOOLEAN DEFAULT FALSE,
  sort_order           INTEGER DEFAULT 0
);

CREATE TABLE calendar_events (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  date_label    TEXT NOT NULL,
  regulation_id TEXT REFERENCES regulations(id),
  agency        TEXT,
  description   TEXT
);

-- Org-scoped user data tables
CREATE TABLE team_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       TEXT NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  role         TEXT,
  avatar_color TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE active_regulations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           TEXT NOT NULL,
  regulation_id    TEXT REFERENCES regulations(id) NOT NULL,
  activated_at     TIMESTAMPTZ DEFAULT NOW(),
  business_profile JSONB DEFAULT '{}',
  UNIQUE(org_id, regulation_id)
);

CREATE TABLE self_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT NOT NULL,
  regulation_id   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'in_progress',
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  completed_by    TEXT,
  section_answers JSONB DEFAULT '{}'
);

CREATE TABLE process_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         TEXT NOT NULL,
  process_id     TEXT NOT NULL,
  team_member_id UUID,
  UNIQUE(org_id, process_id)
);

CREATE TABLE reminders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        TEXT NOT NULL,
  key_date_id   TEXT NOT NULL,
  regulation_id TEXT NOT NULL,
  channel       TEXT NOT NULL,
  timing        TEXT NOT NULL,
  custom_date   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
