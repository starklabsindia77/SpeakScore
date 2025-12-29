CREATE TABLE IF NOT EXISTS schema_migrations_tenant (
  name text PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  name text NOT NULL,
  config_json jsonb NOT NULL,
  expires_at timestamptz NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_tests_users FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS test_questions (
  id uuid PRIMARY KEY,
  org_id uuid NULL,
  type text NOT NULL,
  prompt text NOT NULL,
  meta_json jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  test_id uuid NOT NULL REFERENCES tests(id),
  name text NOT NULL,
  email text NOT NULL,
  phone text NULL,
  status text NOT NULL DEFAULT 'INVITED',
  overall_score integer NULL,
  decision text NULL,
  started_at timestamptz NULL,
  submitted_at timestamptz NULL,
  scored_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidate_attempts (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  test_id uuid NOT NULL REFERENCES tests(id),
  candidate_id uuid NOT NULL REFERENCES candidates(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_candidate_attempt UNIQUE(candidate_id)
);

CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  attempt_id uuid NOT NULL REFERENCES candidate_attempts(id),
  candidate_id uuid NOT NULL REFERENCES candidates(id),
  question_id uuid NOT NULL,
  audio_object_key text NOT NULL,
  transcript text NULL,
  scores_json jsonb NULL,
  confidence numeric NULL,
  relevance_score numeric NULL,
  flagged_reason text NULL,
  flagged_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_usage (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  candidate_id uuid NOT NULL REFERENCES candidates(id),
  attempt_id uuid NOT NULL REFERENCES candidate_attempts(id),
  credits_used integer NOT NULL DEFAULT 1,
  used_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_attempt_credit UNIQUE(attempt_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  actor_user_id uuid NULL,
  action text NOT NULL,
  meta_json jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
