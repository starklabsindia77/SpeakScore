-- Add impersonator_admin_id to platform audit logs
ALTER TABLE audit_logs_platform ADD COLUMN impersonator_admin_id UUID;
