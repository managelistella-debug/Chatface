-- Add lead_capture config column to agents
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS lead_capture JSONB DEFAULT NULL;
