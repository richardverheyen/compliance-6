-- Org-level profile (separate from Clerk org data)
-- id = Clerk orgId (or userId for solo accounts)
CREATE TABLE organisations (
  id                   TEXT PRIMARY KEY,
  location             TEXT,
  applicable_services  TEXT[] DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
