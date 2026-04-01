-- Channel integrations: stores connected Facebook Pages, Instagram accounts, etc.
CREATE TABLE IF NOT EXISTS channel_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,          -- 'messenger' | 'instagram' | 'email'
  page_id TEXT,                   -- Facebook Page ID or Instagram account ID
  page_name TEXT,                 -- Human-readable name
  page_access_token TEXT,         -- Long-lived page access token
  instagram_account_id TEXT,      -- IG Business Account ID (instagram channel)
  instagram_username TEXT,        -- IG handle (instagram channel)
  email_address TEXT,             -- Inbound address (email channel)
  email_config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_integrations_unique
  ON channel_integrations(agent_id, channel, page_id);

CREATE INDEX IF NOT EXISTS idx_channel_integrations_page
  ON channel_integrations(page_id, channel);

CREATE INDEX IF NOT EXISTS idx_channel_integrations_agent
  ON channel_integrations(agent_id, channel);

-- Short-lived CSRF tokens for OAuth state
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL UNIQUE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);

-- Auto-clean expired states
CREATE OR REPLACE FUNCTION delete_expired_oauth_states() RETURNS void AS $$
  DELETE FROM oauth_states WHERE expires_at < now();
$$ LANGUAGE SQL;
