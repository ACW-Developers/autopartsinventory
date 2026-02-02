-- Add model/type column to inventory table
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS model text;

-- Add model to purchase_order_items as well for consistency
ALTER TABLE public.purchase_order_items
ADD COLUMN IF NOT EXISTS model text;