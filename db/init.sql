CREATE EXTENSION IF NOT EXISTS "pgcrypto";
DO $$ BEGIN CREATE TYPE account_type_enum AS ENUM ('private','house'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE recurring_type AS ENUM ('one_time','monthly','yearly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_type account_type_enum NOT NULL,
  current_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_type account_type_enum NOT NULL,
  name text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  category text,
  recurring_type recurring_type NOT NULL DEFAULT 'one_time',
  is_paid boolean NOT NULL DEFAULT false,
  expense_month date NOT NULL,
  generated_from_id uuid,
  template_id uuid,
  chazy_percentage numeric(5,2) NOT NULL DEFAULT 50,
  helly_percentage numeric(5,2) NOT NULL DEFAULT 50,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expenses_user_acct_month_idx ON expenses(user_id, account_type, expense_month);

CREATE TABLE IF NOT EXISTS credit_card_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  billing_month date NOT NULL,
  category text,
  notes text,
  is_paid boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cc_user_month_idx ON credit_card_expenses(user_id, billing_month);

CREATE TABLE IF NOT EXISTS monthly_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_type account_type_enum NOT NULL,
  name text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  category text,
  notes text,
  default_paid boolean NOT NULL DEFAULT false,
  chazy_percentage numeric(5,2) NOT NULL DEFAULT 50,
  helly_percentage numeric(5,2) NOT NULL DEFAULT 50,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS savings_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY,
  default_private_month_offset int NOT NULL DEFAULT 0,
  default_house_month_offset int NOT NULL DEFAULT 0,
  chazy_default_percentage numeric(5,2) NOT NULL DEFAULT 60,
  helly_default_percentage numeric(5,2) NOT NULL DEFAULT 40,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);