
CREATE TABLE IF NOT EXISTS public.monthly_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_type public.account_type NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text,
  notes text,
  default_paid boolean NOT NULL DEFAULT false,
  chazy_percentage numeric NOT NULL DEFAULT 50,
  helly_percentage numeric NOT NULL DEFAULT 50,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public all" ON public.monthly_templates;
CREATE POLICY "public all" ON public.monthly_templates
  FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_monthly_templates_updated ON public.monthly_templates;
CREATE TRIGGER trg_monthly_templates_updated
  BEFORE UPDATE ON public.monthly_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS template_id uuid;

CREATE INDEX IF NOT EXISTS idx_expenses_template_month
  ON public.expenses(template_id, expense_month);
