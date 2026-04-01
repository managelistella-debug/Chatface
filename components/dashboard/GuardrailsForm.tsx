'use client';

import { useState } from 'react';
import { AgentGuardrails } from '@/lib/types/database';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';

const CONFIDENTIALITY_OPTIONS = [
  {
    value: 'off',
    label: 'Full Knowledge — uses training data + your sources',
  },
  {
    value: 'moderate',
    label: 'Prefer My Data — favours your sources, supplements with general knowledge',
  },
  {
    value: 'strict',
    label: 'Sources Only — only answers from your indexed data',
  },
];

const DEFAULT_FALLBACK =
  "I don't have specific details on that in my knowledge base right now. For the most accurate answer, it's best to speak directly with our team — feel free to reach out and we'll get you sorted.";
const DEFAULT_OFF_TOPIC =
  "That's a bit outside what I can help with here — I'm focused on questions about our company and services. Is there something along those lines I can help you with?";

interface GuardrailsFormProps {
  agentId: string;
  initial?: AgentGuardrails | null;
}

export function GuardrailsForm({ agentId, initial }: GuardrailsFormProps) {
  const [confidentiality, setConfidentiality] = useState<AgentGuardrails['confidentiality']>(
    initial?.confidentiality ?? 'moderate'
  );
  const [fallbackMessage, setFallbackMessage] = useState(
    initial?.fallback_message ?? DEFAULT_FALLBACK
  );
  const [restrictTopics, setRestrictTopics] = useState(initial?.restrict_topics ?? true);
  const [offTopicMessage, setOffTopicMessage] = useState(
    initial?.off_topic_message ?? DEFAULT_OFF_TOPIC
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const guardrails: AgentGuardrails = {
        confidentiality,
        fallback_message: fallbackMessage.trim() || DEFAULT_FALLBACK,
        restrict_topics: restrictTopics,
        off_topic_message: offTopicMessage.trim() || DEFAULT_OFF_TOPIC,
      };

      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardrails }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      toast('Guardrails saved', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Confidentiality */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-primary">Confidentiality</label>
        <p className="text-xs text-muted">
          Controls whether the agent answers only from your indexed data sources or can also draw on
          its general training knowledge.
        </p>
        <Select
          options={CONFIDENTIALITY_OPTIONS}
          value={confidentiality}
          onChange={(e) => setConfidentiality(e.target.value as AgentGuardrails['confidentiality'])}
        />
      </div>

      {/* Fallback message */}
      {confidentiality !== 'off' && (
        <div className="space-y-1">
          <Textarea
            label="Fallback Message"
            placeholder={DEFAULT_FALLBACK}
            value={fallbackMessage}
            onChange={(e) => setFallbackMessage(e.target.value)}
            rows={2}
          />
          <p className="text-xs text-muted">
            Sent when the agent can't find an answer in its knowledge base.
          </p>
        </div>
      )}

      {/* Restrict to business topics */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={restrictTopics}
          onClick={() => setRestrictTopics((v) => !v)}
          className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            restrictTopics ? 'bg-primary' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              restrictTopics ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        <div>
          <p className="text-sm font-medium text-primary leading-tight">
            Restrict to Business Topics
          </p>
          <p className="text-xs text-muted mt-0.5">
            Redirect users who ask questions unrelated to your company or services.
          </p>
        </div>
      </div>

      {/* Off-topic message */}
      {restrictTopics && (
        <div className="space-y-1 pl-12">
          <Textarea
            label="Off-Topic Message"
            placeholder={DEFAULT_OFF_TOPIC}
            value={offTopicMessage}
            onChange={(e) => setOffTopicMessage(e.target.value)}
            rows={2}
          />
          <p className="text-xs text-muted">
            Sent when the user asks about something outside the business scope.
          </p>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Guardrails'}
      </Button>
    </div>
  );
}
