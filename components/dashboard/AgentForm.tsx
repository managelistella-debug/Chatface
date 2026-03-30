'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { Agent } from '@/lib/types/database';

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Default)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
];

const PROMPT_TEMPLATES = [
  { value: 'custom', label: 'Custom' },
  { value: 'base', label: 'Base Instructions' },
  { value: 'general', label: 'General AI Agent' },
  { value: 'support', label: 'Customer Support Agent' },
  { value: 'sales', label: 'Sales Agent' },
];

interface AgentFormProps {
  agent?: Agent;
}

export function AgentForm({ agent }: AgentFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [name, setName] = useState(agent?.name || '');
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt || 'You are a helpful assistant.');
  const [model, setModel] = useState(agent?.model || 'gpt-4o-mini');
  const [temperature, setTemperature] = useState(agent?.temperature ?? 0.7);
  const [profilePicture, setProfilePicture] = useState(agent?.profile_picture_url || '');
  const [template, setTemplate] = useState('custom');
  const [hasDataSources, setHasDataSources] = useState(false);

  const isEdit = !!agent;

  // Check if agent has indexed data sources (enables personalisation)
  useEffect(() => {
    if (!agent?.id) return;
    fetch(`/api/data-sources?agent_id=${agent.id}`)
      .then((r) => r.json())
      .then((j) => {
        const completed = (j.data || []).some((s: { status: string }) => s.status === 'completed');
        setHasDataSources(completed);
      })
      .catch(() => {});
  }, [agent?.id]);

  async function generatePersonalisedPrompt(templateValue: string) {
    if (!agent?.id || templateValue === 'custom') return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/generate-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateValue }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSystemPrompt(json.data.prompt);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleTemplateChange(value: string) {
    setTemplate(value);
    if (value === 'custom') return;
    // If data sources are available, generate a personalised prompt
    if (hasDataSources && agent?.id) {
      await generatePersonalisedPrompt(value);
    } else {
      // Fall back to generic template
      const generics: Record<string, string> = {
        base: `You are a knowledgeable team member. Answer questions directly and helpfully. Never proactively share contact details — only provide them if the user asks. Only suggest contacting the team for things that genuinely require a human.`,
        general: `You are a knowledgeable company representative. Answer questions clearly, directly, and thoroughly. Be specific. Never proactively share phone numbers or email addresses — only if the user asks. Only suggest a call or meeting for things that cannot be handled in this conversation.`,
        support: `You are a knowledgeable support specialist. Answer questions directly and thoroughly — you are the expert the user is speaking with. Never proactively share contact details or end with "feel free to reach out" prompts. Only suggest a call or meeting for things that genuinely require human involvement.`,
        sales: `You are a knowledgeable sales consultant. Answer every question fully and specifically before suggesting a call or meeting. Never proactively share phone numbers or email addresses — only if the user asks. Suggest a discovery call only as a natural next step after you've genuinely helped them.`,
      };
      if (generics[value]) setSystemPrompt(generics[value]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const url = isEdit ? `/api/agents/${agent.id}` : '/api/agents';
      const method = isEdit ? 'PUT' : 'POST';

      // Only include profile_picture_url if it has a value, to avoid
      // failing on DBs where migration 003 hasn't been run yet
      const body: Record<string, unknown> = {
        name: name.trim(),
        system_prompt: systemPrompt,
        model,
        temperature,
      };
      if (profilePicture.trim()) {
        body.profile_picture_url = profilePicture.trim();
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      toast(isEdit ? 'Agent updated' : 'Agent created', 'success');
      if (!isEdit) {
        router.push(`/dashboard/agents/${json.data.id}`);
      }
      router.refresh();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Input
        label="Agent Name"
        placeholder="e.g. Customer Support Bot"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <Input
        label="Profile Picture URL (optional)"
        placeholder="https://example.com/avatar.png"
        value={profilePicture}
        onChange={(e) => setProfilePicture(e.target.value)}
      />

      {/* Instruction Template selector */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-primary">Instruction Template</label>
          {hasDataSources && template !== 'custom' && (
            <button
              type="button"
              onClick={() => generatePersonalisedPrompt(template)}
              disabled={generating}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-medium disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <>
                  <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  Personalising…
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Re-personalise
                </>
              )}
            </button>
          )}
        </div>
        <Select
          options={PROMPT_TEMPLATES}
          value={template}
          onChange={(e) => handleTemplateChange(e.target.value)}
        />
        {generating && (
          <p className="text-xs text-muted mt-1 flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-border border-t-primary rounded-full animate-spin" />
            Reading your data sources to personalise the instructions…
          </p>
        )}
        {!hasDataSources && template !== 'custom' && (
          <p className="text-xs text-muted mt-1">
            Add a data source to get instructions personalised to your business.
          </p>
        )}
        {hasDataSources && template === 'custom' && (
          <p className="text-xs text-muted mt-1">
            Select a template above to auto-generate instructions based on your data sources.
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Textarea
          label="System Prompt / Instructions"
          placeholder="Describe how the agent should behave..."
          value={systemPrompt}
          onChange={(e) => { setSystemPrompt(e.target.value); setTemplate('custom'); }}
          rows={6}
        />
        <p className="text-xs text-muted leading-relaxed">
          <strong className="text-primary font-medium">Tip:</strong> Tell the agent who it is, what it should do, and
          what to avoid. Common pitfalls to call out explicitly:{' '}
          <em>&quot;Never end responses with 'feel free to reach out' or proactively share phone/email — only provide
          contact details if the user asks.&quot;</em>{' '}
          Use a template above to get a well-structured starting point.
        </p>
      </div>

      <Select
        label="Model"
        options={MODEL_OPTIONS}
        value={model}
        onChange={(e) => setModel(e.target.value as Agent['model'])}
      />

      <div className="flex gap-3">
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : isEdit ? 'Update Agent' : 'Create Agent'}
        </Button>
        {isEdit && (
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
