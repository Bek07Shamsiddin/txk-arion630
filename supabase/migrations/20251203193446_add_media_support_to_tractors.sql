/*
  # Add Multiple Media Support to Tractors

  1. Changes
    - Add `media_urls` column to `tractors` table as JSONB array
    - Keep existing `photo_url` column for backward compatibility
    - Media URLs will store array of strings (URLs to photos/videos)

  2. Important Notes
    - New field supports both photos and videos
    - Existing photo_url data remains intact
    - Applications should prioritize media_urls over photo_url when available
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tractors' AND column_name = 'media_urls'
  ) THEN
    ALTER TABLE tractors ADD COLUMN media_urls jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

COMMENT ON COLUMN tractors.media_urls IS 'Array of media URLs (photos and videos) for tractor documentation';
