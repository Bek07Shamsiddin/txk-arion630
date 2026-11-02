/*
  # Storage Bucket Setup for Profile Photos

  1. New Buckets
    - `photos` bucket for storing tractor photos, damage reports, service records, and profile photos
  
  2. Security
    - Enable RLS on the photos bucket
    - Allow authenticated users to upload photos
    - Allow everyone to read photos (public bucket)
    - Allow authenticated users to update and delete photos
  
  3. Important Notes
    - File size limits enforced at application level (10MB for profile photos)
    - Supported formats: JPG, PNG for profile photos
    - Videos supported for tractor/service/damage documentation
*/

-- Create the photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete photos" ON storage.objects;

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'photos');

-- Allow anyone to view photos (since bucket is public)
CREATE POLICY "Anyone can view photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'photos');

-- Allow authenticated users to update photos
CREATE POLICY "Users can update photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'photos')
  WITH CHECK (bucket_id = 'photos');

-- Allow authenticated users to delete photos
CREATE POLICY "Users can delete photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'photos');
