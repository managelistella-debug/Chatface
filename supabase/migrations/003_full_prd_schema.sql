-- Migration: Full PRD schema additions
-- Adds tables and columns for Q&A pairs, AI actions, leads, analytics,
-- help pages, and extends agents/conversations/messages.

-- =============================================================================
-- 1. Add columns to agents table
-- =============================================================================
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
  ADD COLUMN IF NOT EXISTS chat_icon_url TEXT,
  ADD COLUMN IF NOT EXISTS last_trained_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_data_size BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_steps JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =============================================================================
-- 2. Add columns to conversations table
-- =============================================================================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_human_takeover BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS human_takeover_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sentiment TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score FLOAT;

-- =============================================================================
-- 3. Add columns to messages table
-- =============================================================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS feedback_text TEXT;

-- =============================================================================
-- 4. qa_pairs table – Q&A training data
-- =============================================================================
CREATE TABLE IF NOT EXISTS qa_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qa_pairs_agent_id ON qa_pairs(agent_id);

-- =============================================================================
-- 5. ai_actions table – configurable AI actions
-- =============================================================================
CREATE TABLE IF NOT EXISTS ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_agent_id ON ai_actions(agent_id);

-- =============================================================================
-- 6. leads table – collected leads
-- =============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_conversation_id ON leads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- =============================================================================
-- 7. analytics_events table – event tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_agent_id ON analytics_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_agent_type ON analytics_events(agent_id, event_type);

-- =============================================================================
-- 8. help_pages table – standalone help page config
-- =============================================================================
CREATE TABLE IF NOT EXISTS help_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE UNIQUE,
  slug TEXT UNIQUE NOT NULL,
  is_published BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_pages_agent_id ON help_pages(agent_id);
CREATE INDEX IF NOT EXISTS idx_help_pages_slug ON help_pages(slug);
