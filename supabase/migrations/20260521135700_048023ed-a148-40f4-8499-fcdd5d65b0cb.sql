CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY,
  default_private_month_offset INT NOT NULL DEFAULT 0,
  default_house_month_offset INT NOT NULL DEFAULT 0,
  chazy_default_percentage NUMERIC NOT NULL DEFAULT 60,
  helly_default_percentage NUMERIC NOT NULL DEFAULT 40,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER set_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();