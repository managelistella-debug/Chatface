-- Migration: Add user authentication scoping
-- Links agents to Supabase auth users

-- Add user_id to agents
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
