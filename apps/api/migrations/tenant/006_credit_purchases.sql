CREATE TABLE IF NOT EXISTS credit_purchases (
  id uuid primary key,
  razorpay_order_id text not null,
  razorpay_payment_id text,
  amount numeric not null,
  credits numeric not null,
  currency text default 'INR',
  status text not null,
  meta_json jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
