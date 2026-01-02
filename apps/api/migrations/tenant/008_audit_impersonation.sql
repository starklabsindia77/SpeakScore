-- Add impersonator_admin_id to tenant audit logs
ALTER TABLE audit_logs ADD COLUMN impersonator_admin_id UUID;
