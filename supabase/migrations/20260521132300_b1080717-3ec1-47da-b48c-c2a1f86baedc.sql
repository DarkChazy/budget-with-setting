ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS chazy_percentage numeric NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS helly_percentage numeric NOT NULL DEFAULT 50;