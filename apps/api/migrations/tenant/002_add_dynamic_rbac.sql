-- Migration to support dynamic roles and permissions per organization

CREATE TABLE IF NOT EXISTS custom_roles (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    permissions text[] NOT NULL DEFAULT '{}',
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uniq_role_name UNIQUE(name)
);

-- Seed default roles for the tenant
INSERT INTO custom_roles (id, name, permissions, is_system)
VALUES 
    (gen_random_uuid(), 'ORG_ADMIN', '{*}', true),
    (gen_random_uuid(), 'RECRUITER', '{view_candidates, invite_candidates, view_tests}', true)
ON CONFLICT (name) DO NOTHING;

-- Add title and custom_role_id to users
-- Note: We keep the legacy 'role' column for now to avoid breaking changes during transition
ALTER TABLE users ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_role_id uuid REFERENCES custom_roles(id);

-- Backfill custom_role_id for existing users based on their legacy role
UPDATE users u
SET custom_role_id = r.id
FROM custom_roles r
WHERE u.role = r.name AND u.custom_role_id IS NULL;
