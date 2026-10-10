-- Ensure tenant-assets bucket exists in Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to tenant-assets
CREATE POLICY "Public Read Access for tenant-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-assets');

-- Allow service role full access
CREATE POLICY "Service Role Full Access for tenant-assets"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'tenant-assets')
WITH CHECK (bucket_id = 'tenant-assets');
