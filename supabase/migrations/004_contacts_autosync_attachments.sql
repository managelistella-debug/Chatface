-- Migration 004: Contacts, auto-sync, attachments, user tracking

-- =============================================================================
-- 1. contacts table — tracks identified users across conversations
-- =============================================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_identifier TEXT NOT NULL,
  name TEXT,
  email TEXT,
  metadata JSONB DEFAULT '{}',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  conversation_count INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(agent_id, user_identifier)
);

CREATE INDEX IF NOT EXISTS idx_contacts_agent_id ON contacts(agent_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_identifier ON contacts(agent_id, user_identifier);
CREATE INDEX IF NOT EXISTS idx_contacts_last_seen ON contacts(agent_id, last_seen_at DESC);

-- =============================================================================
-- 2. conversations — add user_identifier for contact tracking
-- =============================================================================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS user_identifier TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_user_identifier ON conversations(agent_id, user_identifier);

-- =============================================================================
-- 3. data_sources — auto-sync scheduling
-- =============================================================================
ALTER TABLE data_sources
  ADD COLUMN IF NOT EXISTS auto_sync BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_interval_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_sync_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_data_sources_auto_sync ON data_sources(auto_sync, next_sync_at)
  WHERE auto_sync = true;

-- =============================================================================
-- 4. messages — attachments + correction tracking
-- =============================================================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_corrected BOOLEAN DEFAULT false;

-- =============================================================================
-- 5. upsert_contact RPC — called from chat API on every new conversation
-- =============================================================================
CREATE OR REPLACE FUNCTION upsert_contact(
  p_agent_id UUID,
  p_user_identifier TEXT
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO contacts (agent_id, user_identifier, first_seen_at, last_seen_at, conversation_count)
  VALUES (p_agent_id, p_user_identifier, now(), now(), 1)
  ON CONFLICT (agent_id, user_identifier) DO UPDATE
    SET last_seen_at = now(),
        conversation_count = contacts.conversation_count + 1;
END;
$$;
