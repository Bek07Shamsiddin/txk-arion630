/*
  # Create Mechanic Requests Table

  1. New Table
    - `mechanic_requests`
      - `id` (uuid, primary key)
      - `tractor_id` (uuid, foreign key to tractors)
      - `operator_name` (text) - Name of the operator requesting assistance
      - `problem_description` (text) - Description of the issue
      - `request_date` (timestamptz) - When the request was made
      - `status` (text) - Status: pending, in_progress, completed
      - `assigned_technician_id` (text) - ID of assigned technician (optional)
      - `completed_at` (timestamptz) - When the work was completed
      - `technician_notes` (text) - Notes from the technician
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on mechanic_requests table
    - Add policies for authenticated users to view and create requests
    - All users can view all requests
    - All users can create and update requests

  3. Indexes
    - Index on tractor_id for faster lookups
    - Index on status for filtering
    - Index on request_date for sorting
*/

CREATE TABLE IF NOT EXISTS mechanic_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tractor_id uuid NOT NULL REFERENCES tractors(id) ON DELETE CASCADE,
  operator_name text NOT NULL,
  problem_description text NOT NULL,
  request_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  assigned_technician_id text,
  completed_at timestamptz,
  technician_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mechanic_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all mechanic requests"
  ON mechanic_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create mechanic requests"
  ON mechanic_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update mechanic requests"
  ON mechanic_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete mechanic requests"
  ON mechanic_requests FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_mechanic_requests_tractor_id ON mechanic_requests(tractor_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_requests_status ON mechanic_requests(status);
CREATE INDEX IF NOT EXISTS idx_mechanic_requests_date ON mechanic_requests(request_date DESC);

COMMENT ON TABLE mechanic_requests IS 'Tracks mechanic/technician requests for tractor repairs and maintenance';
COMMENT ON COLUMN mechanic_requests.status IS 'Status: pending, in_progress, completed';
