'use client';

import { useState } from 'react';
import { LeadCaptureConfig } from '@/lib/types/database';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

const DEFAULT_CONFIG: LeadCaptureConfig = {
  enabled: false,
  timing: 'after_messages',
  after_messages_count: 3,
  allow_bypass: true,
  fields: { name: true, email: true, phone: false },
};

interface LeadCaptureFormProps {
  agentId: string;
  initial?: LeadCaptureConfig | null;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        checked ? 'bg-primary' : 'bg-border'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function FieldCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
          checked ? 'bg-primary border-primary' : 'border-border bg-white'
        }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </div>
      <span className="text-sm text-primary">{label}</span>
    </label>
  );
}

export function LeadCaptureForm({ agentId, initial }: LeadCaptureFormProps) {
  const cfg = initial ?? DEFAULT_CONFIG;

  const [enabled, setEnabled] = useState(cfg.enabled);
  const [timing, setTiming] = useState<LeadCaptureConfig['timing']>(cfg.timing ?? 'after_messages');
  const [afterCount, setAfterCount] = useState(cfg.after_messages_count ?? 3);
  const [allowBypass, setAllowBypass] = useState(cfg.allow_bypass ?? true);
  const [fieldName, setFieldName] = useState(cfg.fields?.name ?? true);
  const [fieldEmail, setFieldEmail] = useState(cfg.fields?.email ?? true);
  const [fieldPhone, setFieldPhone] = useState(cfg.fields?.phone ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const lead_capture: LeadCaptureConfig = {
        enabled,
        timing,
        after_messages_count: afterCount,
        allow_bypass: allowBypass,
        fields: { name: fieldName, email: fieldEmail, phone: fieldPhone },
      };

      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_capture }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      toast('Lead capture settings saved', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Master enable toggle */}
      <div className="flex items-start gap-3">
        <Toggle checked={enabled} onChange={setEnabled} />
        <div>
          <p className="text-sm font-medium text-primary leading-tight">Enable Lead Capture</p>
          <p className="text-xs text-muted mt-0.5">
            Prompt visitors for their contact details during the conversation.
          </p>
        </div>
      </div>

      {enabled && (
        <div className="pl-12 space-y-5">
          {/* When to collect */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">When to collect</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div
                  onClick={() => setTiming('start')}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                    timing === 'start' ? 'border-primary' : 'border-border'
                  }`}
                >
                  {timing === 'start' && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <span className="text-sm text-primary">At the start of the chat</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <div
                  onClick={() => setTiming('after_messages')}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                    timing === 'after_messages' ? 'border-primary' : 'border-border'
                  }`}
                >
                  {timing === 'after_messages' && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <span className="text-sm text-primary">After</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={afterCount}
                  onChange={(e) => setAfterCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  onClick={() => setTiming('after_messages')}
                  className="w-14 px-2 py-1 border border-border rounded-md text-sm text-center bg-white text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-sm text-primary">messages</span>
              </label>
            </div>
            <p className="text-xs text-muted">
              {timing === 'start'
                ? 'The form appears before the visitor sends their first message.'
                : `The form appears after the visitor has sent ${afterCount} message${afterCount !== 1 ? 's' : ''}.`}
            </p>
          </div>

          {/* Fields to collect */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Fields to collect</p>
            <div className="space-y-2">
              <FieldCheckbox label="Full Name" checked={fieldName} onChange={setFieldName} />
              <FieldCheckbox label="Email Address" checked={fieldEmail} onChange={setFieldEmail} />
              <FieldCheckbox label="Phone Number" checked={fieldPhone} onChange={setFieldPhone} />
            </div>
          </div>

          {/* Allow bypass */}
          <div className="flex items-start gap-3">
            <Toggle checked={allowBypass} onChange={setAllowBypass} />
            <div>
              <p className="text-sm font-medium text-primary leading-tight">Allow visitors to skip</p>
              <p className="text-xs text-muted mt-0.5">
                {allowBypass
                  ? 'Visitors can dismiss the form and continue chatting without providing details.'
                  : 'Visitors must provide contact details before they can continue the conversation.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Lead Capture'}
      </Button>
    </div>
  );
}
