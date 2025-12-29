-- Normalize organization statuses to uppercase and enforce allowed values
UPDATE public.organizations SET status = 'ACTIVE' WHERE status IN ('active', 'ACTIVE');
UPDATE public.organizations SET status = 'DISABLED' WHERE status IN ('inactive', 'INACTIVE', 'disabled', 'DISABLED');
UPDATE public.organizations SET status = 'PROVISIONING' WHERE status IN ('provisioning', 'PROVISIONING');

ALTER TABLE public.organizations
  ALTER COLUMN status SET DEFAULT 'ACTIVE';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' AND table_name = 'organizations' AND constraint_name = 'organizations_status_check'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_status_check CHECK (status IN ('ACTIVE', 'DISABLED', 'PROVISIONING'));
  END IF;
END $$;

-- Expand platform audit logs to support platform admin panel
ALTER TABLE public.audit_logs_platform
  ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'INFO',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS message text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS org_id uuid NULL,
  ALTER COLUMN actor_admin_id DROP NOT NULL;

UPDATE public.audit_logs_platform SET message = COALESCE(message, action) WHERE message IS NULL OR message = '';

ALTER TABLE public.audit_logs_platform
  ALTER COLUMN message DROP DEFAULT;
