-- Migration: 003_platform_settings
-- Schema: public

CREATE TABLE platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default AI configuration
INSERT INTO platform_settings (key, value)
VALUES ('ai_config', '{"provider": "gemini", "apiKeys": [], "model": "gemini-1.5-pro"}')
ON CONFLICT (key) DO NOTHING;
