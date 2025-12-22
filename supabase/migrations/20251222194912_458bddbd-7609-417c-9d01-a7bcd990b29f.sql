-- Add brand and car year columns to purchase_order_items
ALTER TABLE public.purchase_order_items 
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS car_year_from integer,
ADD COLUMN IF NOT EXISTS car_year_to integer;