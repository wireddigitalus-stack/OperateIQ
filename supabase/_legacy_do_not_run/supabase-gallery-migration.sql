-- Run this in: Supabase Dashboard → SQL Editor
-- Adds multi-image gallery support to the property_image_overrides table

-- 1. Add hero_url column (mirrors image_url but semantically cleaner)
ALTER TABLE property_image_overrides
  ADD COLUMN IF NOT EXISTS hero_url TEXT;

-- 2. Add all_urls column (JSONB array of all uploaded image URLs)
ALTER TABLE property_image_overrides
  ADD COLUMN IF NOT EXISTS all_urls JSONB DEFAULT '[]';

-- 3. Back-fill hero_url from existing image_url records
UPDATE property_image_overrides
  SET hero_url = image_url
  WHERE hero_url IS NULL AND image_url IS NOT NULL;

-- 4. Back-fill all_urls from existing image_url records
UPDATE property_image_overrides
  SET all_urls = jsonb_build_array(image_url)
  WHERE all_urls = '[]' AND image_url IS NOT NULL;

-- Done! The property gallery manager and API are now ready.
