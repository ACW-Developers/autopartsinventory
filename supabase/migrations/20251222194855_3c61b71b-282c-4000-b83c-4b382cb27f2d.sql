-- Add brand and car year columns to inventory
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS car_year_from integer,
ADD COLUMN IF NOT EXISTS car_year_to integer;

-- Insert predefined categories
INSERT INTO public.categories (name, description) 
VALUES 
  ('Suspension Parts', 'Shock absorbers, struts, control arms, and related components'),
  ('Engine/Transmission Parts', 'Engine components, transmission parts, and drivetrain'),
  ('Body Parts', 'Exterior and interior body panels, bumpers, and trim'),
  ('Electrical/Electronic Parts', 'Wiring, sensors, lights, and electronic modules')
ON CONFLICT DO NOTHING;