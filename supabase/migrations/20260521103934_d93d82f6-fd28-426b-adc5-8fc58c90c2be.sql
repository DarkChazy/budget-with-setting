
-- Enums
CREATE TYPE public.account_type AS ENUM ('private','house');
CREATE TYPE public.recurring_type AS ENUM ('one_time','monthly','yearly');

-- Users
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts (one row per (user, account_type))
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_type public.account_type NOT NULL,
  current_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_type)
);

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_type public.account_type NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  category TEXT,
  recurring_type public.recurring_type NOT NULL DEFAULT 'one_time',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  expense_month DATE NOT NULL,
  generated_from_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_user_month ON public.expenses(user_id, account_type, expense_month) WHERE deleted_at IS NULL;

-- Savings accounts
CREATE TABLE public.savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Credit card expenses
CREATE TABLE public.credit_card_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_month DATE NOT NULL,
  notes TEXT,
  category TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cc_user_month ON public.credit_card_expenses(user_id, billing_month) WHERE deleted_at IS NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_savings_updated BEFORE UPDATE ON public.savings_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cc_updated BEFORE UPDATE ON public.credit_card_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed users + accounts
INSERT INTO public.users (name) VALUES ('Helly'), ('Chazy');
INSERT INTO public.accounts (user_id, account_type, current_amount)
SELECT id, 'private'::public.account_type, 0 FROM public.users
UNION ALL
SELECT id, 'house'::public.account_type, 0 FROM public.users;

-- RLS: enable + permissive policies (no auth in this app, 2-user household tool)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.savings_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.credit_card_expenses FOR ALL USING (true) WITH CHECK (true);
