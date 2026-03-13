-- Create a public storage bucket for E2E test artifacts (videos and PDFs).
-- This bucket is public so links in the README can be opened without authentication.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'e2e-artifacts',
  'e2e-artifacts',
  true,
  52428800, -- 50 MB per file
  ARRAY['video/webm', 'application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public (anonymous) reads on this bucket.
CREATE POLICY "Public read e2e-artifacts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'e2e-artifacts');
