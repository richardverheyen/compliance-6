-- Clean slate: wipe existing data incompatible with new schema
TRUNCATE team_members;
TRUNCATE process_assignments;

-- team_members: drop name/email columns (sourced from Clerk at runtime)
ALTER TABLE team_members
  DROP COLUMN name,
  DROP COLUMN email;

-- team_members: change id from UUID to TEXT (Clerk user ID like "user_2abc...")
ALTER TABLE team_members ALTER COLUMN id DROP DEFAULT;
ALTER TABLE team_members ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- process_assignments: change team_member_id from UUID to TEXT
ALTER TABLE process_assignments ALTER COLUMN team_member_id TYPE TEXT USING team_member_id::TEXT;
