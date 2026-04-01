-- Add guardrails JSONB column to agents
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS guardrails JSONB DEFAULT '{}'::jsonb;

-- Set sensible default guardrails for existing agents (restrict off-topic by default)
UPDATE agents
SET guardrails = '{
  "confidentiality": "moderate",
  "restrict_topics": true,
  "fallback_message": "I don''t have specific details on that in my knowledge base right now. For the most accurate answer, it''s best to speak directly with our team — feel free to reach out and we''ll get you sorted.",
  "off_topic_message": "That''s a bit outside what I can help with here — I''m focused on questions about our company and services. Is there something along those lines I can help you with?"
}'::jsonb
WHERE guardrails = '{}'::jsonb OR guardrails IS NULL;
