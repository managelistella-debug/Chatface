'use client';

import { WidgetConfig } from '@/lib/types/database';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';

const SYSTEM_PROMPT_TEMPLATES: Record<string, string> = {
  'Base Instructions': 'You are a helpful assistant.',
  'General AI Agent':
    'You are a knowledgeable AI assistant. Answer questions clearly and thoroughly. If you don\'t know something, say so honestly.',
  'Customer Support Agent':
    'You are a friendly customer support agent. Help users resolve their issues efficiently. Be empathetic and solution-oriented. If you cannot resolve an issue, offer to escalate to a human agent.',
  'Sales Agent':
    'You are a professional sales assistant. Help potential customers understand our products and services. Answer questions, address concerns, and guide them toward making informed purchasing decisions. Collect contact information when appropriate.',
  Custom: '',
};

const TEMPLATE_OPTIONS = Object.keys(SYSTEM_PROMPT_TEMPLATES).map((name) => ({
  value: name,
  label: name,
}));

interface AITabProps {
  config: WidgetConfig;
  onUpdate: (field: keyof WidgetConfig, value: unknown) => void;
  baseSystemPrompt?: string;
}

export function AITab({ config, onUpdate, baseSystemPrompt }: AITabProps) {
  const syncEnabled = config.sync_base_instructions ?? true;
  const currentTemplate = config.instruction_template || 'Base Instructions';

  function handleTemplateChange(templateName: string) {
    onUpdate('instruction_template', templateName);
    if (templateName !== 'Custom') {
      onUpdate('widget_instructions', SYSTEM_PROMPT_TEMPLATES[templateName]);
    }
  }

  return (
    <div className="space-y-5">
      {/* Sync with Base Instructions */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={syncEnabled}
            onChange={(e) => onUpdate('sync_base_instructions', e.target.checked)}
            className="rounded border-border text-brand-600 focus:ring-primary/20"
          />
          <span className="text-sm font-medium text-primary">
            Sync with Base Instructions
          </span>
        </label>
        <p className="text-xs text-muted ml-6">
          When enabled, the widget uses the same system prompt as your agent&apos;s base instructions.
        </p>
        {syncEnabled && baseSystemPrompt && (
          <div className="ml-6 p-3 bg-surface-hover rounded-lg border border-border">
            <p className="text-xs text-muted mb-1">Current base instructions:</p>
            <p className="text-sm text-primary line-clamp-3">{baseSystemPrompt}</p>
          </div>
        )}
      </div>

      {/* Widget-specific Instructions (only when sync is off) */}
      <div className={syncEnabled ? 'opacity-50 pointer-events-none' : ''}>
        <Select
          label="Instruction Template"
          options={TEMPLATE_OPTIONS}
          value={currentTemplate}
          onChange={(e) => handleTemplateChange(e.target.value)}
        />
      </div>

      <div className={syncEnabled ? 'opacity-50 pointer-events-none' : ''}>
        <Textarea
          label="Widget-specific Instructions"
          placeholder="Enter custom instructions for the widget..."
          value={config.widget_instructions || SYSTEM_PROMPT_TEMPLATES[currentTemplate] || ''}
          onChange={(e) => {
            onUpdate('widget_instructions', e.target.value);
            if (config.instruction_template !== 'Custom') {
              onUpdate('instruction_template', 'Custom');
            }
          }}
          rows={8}
        />
        <p className="text-xs text-muted mt-1">
          These instructions are used only for the embedded widget, separate from your agent&apos;s base instructions.
        </p>
      </div>
    </div>
  );
}
