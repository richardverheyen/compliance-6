-- Add designated_services to org profile
-- Stores org-level designated service selections as { [controlId]: "Yes" }
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS designated_services JSONB DEFAULT '{}';
