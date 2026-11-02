/*
  # Create Parts Requests Table

  1. New Table
    - `parts_requests`
      - `id` (uuid, primary key)
      - `tractor_id` (uuid, foreign key to tractors)
      - `part_name` (text) - Name of the requested part
      - `quantity` (integer) - Number of parts requested
      - `urgency` (text) - Urgency level: urgent, medium, normal
      - `request_date` (timestamptz) - When the request was made
      - `delivery_status` (text) - Status: pending, ordered, in_transit, delivered, cancelled
      - `requested_by` (text) - Person who made the request
      - `notes` (text) - Additional notes or specifications
      - `delivered_at` (timestamptz) - When the part was delivered
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on parts_requests table
    - Add policies for authenticated users to view and create requests
    - All users can view all requests (for admin panel)
    - All users can create and update requests

  3. Indexes
    - Index on tractor_id for faster lookups
    - Index on delivery_status for filtering
    - Index on urgency for prioritization
*/

CREATE TABLE IF NOT EXISTS parts_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tractor_id uuid NOT NULL REFERENCES tractors(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  urgency text NOT NULL DEFAULT 'normal',
  request_date timestamptz NOT NULL DEFAULT now(),
  delivery_status text NOT NULL DEFAULT 'pending',
  requested_by text,
  notes text,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE parts_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all parts requests"
  ON parts_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create parts requests"
  ON parts_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update parts requests"
  ON parts_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete parts requests"
  ON parts_requests FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_parts_requests_tractor_id ON parts_requests(tractor_id);
CREATE INDEX IF NOT EXISTS idx_parts_requests_status ON parts_requests(delivery_status);
CREATE INDEX IF NOT EXISTS idx_parts_requests_urgency ON parts_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_parts_requests_date ON parts_requests(request_date DESC);

COMMENT ON TABLE parts_requests IS 'Tracks parts requests for tractor maintenance and repairs';
COMMENT ON COLUMN parts_requests.urgency IS 'Urgency level: urgent, medium, normal';
COMMENT ON COLUMN parts_requests.delivery_status IS 'Status: pending, ordered, in_transit, delivered, cancelled';
