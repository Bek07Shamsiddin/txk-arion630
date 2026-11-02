/*
  # Create Damage Reports Table

  1. New Table
    - `damage_reports`
      - `id` (uuid, primary key)
      - `tractor_id` (uuid, foreign key)
      - `damage_type` (text) - Type of damage (mechanical, collision, etc.)
      - `description` (text) - Detailed description of damage
      - `location` (text) - Specific location on tractor
      - `severity` (text) - Severity level (low, medium, high, critical)
      - `media_urls` (jsonb) - Array of photo/video URLs
      - `reported_at` (timestamptz) - When damage was reported
      - `status` (text) - Status (reported, under_repair, repaired)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on damage_reports table
    - Add policies for authenticated users to view and create reports
*/

CREATE TABLE IF NOT EXISTS damage_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tractor_id uuid NOT NULL REFERENCES tractors(id) ON DELETE CASCADE,
  damage_type text NOT NULL,
  description text NOT NULL,
  location text,
  severity text NOT NULL DEFAULT 'medium',
  media_urls jsonb DEFAULT '[]'::jsonb,
  reported_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'reported',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view damage reports"
  ON damage_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create damage reports"
  ON damage_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update damage reports"
  ON damage_reports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_damage_reports_tractor_id ON damage_reports(tractor_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_status ON damage_reports(status);
CREATE INDEX IF NOT EXISTS idx_damage_reports_severity ON damage_reports(severity);

COMMENT ON TABLE damage_reports IS 'Records of damage incidents for tractors with photo/video documentation';
COMMENT ON COLUMN damage_reports.media_urls IS 'Array of URLs to photos and videos documenting the damage';
COMMENT ON COLUMN damage_reports.severity IS 'Severity: low, medium, high, critical';
COMMENT ON COLUMN damage_reports.status IS 'Status: reported, under_repair, repaired';
