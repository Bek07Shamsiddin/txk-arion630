/*
  # Add Claas Arion 630 Tractor

  1. New Tractor
    - Model: Claas Arion 630
    - Brand: Claas
    - Engine Power: 145 HP
    - Initial Moto-hours: 0
    - Category: Medium tractor
    - Status: Active
  
  2. Important Notes
    - This tractor is added as a default option for the system
    - Next service is automatically set to 50 hours (first service interval)
    - Registration date is set to today
    - Location is set to a default value
*/

-- Insert Claas Arion 630 tractor
INSERT INTO tractors (
  model,
  serial_number,
  registration_date,
  current_moto_hours,
  next_service_hours,
  location,
  status,
  photo_url,
  media_urls,
  created_at,
  updated_at
)
VALUES (
  'Claas Arion 630',
  'CLAAS-630-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
  CURRENT_DATE,
  0,
  50,
  'Main Depot',
  'active',
  NULL,
  '[]'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;
