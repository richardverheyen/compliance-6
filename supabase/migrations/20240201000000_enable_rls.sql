-- Enable RLS on all tables
ALTER TABLE regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_key_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Reference tables: allow public read (not sensitive, read by unauthenticated API routes)
CREATE POLICY "Public read" ON regulations FOR SELECT USING (true);
CREATE POLICY "Public read" ON regulation_key_dates FOR SELECT USING (true);
CREATE POLICY "Public read" ON calendar_events FOR SELECT USING (true);

-- User data tables have no policies — anon key access is blocked by default.
-- All app queries use the service_role key (server-side only), which bypasses RLS.
