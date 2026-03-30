'use client';

import { WidgetConfig } from '@/lib/types/database';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

interface ContentTabProps {
  config: WidgetConfig;
  onUpdate: (field: keyof WidgetConfig, value: unknown) => void;
}

export function ContentTab({ config, onUpdate }: ContentTabProps) {
  return (
    <div className="space-y-5">
      <Input
        label="Display Name"
        placeholder="e.g. Support Bot"
        value={config.display_name || ''}
        onChange={(e) => onUpdate('display_name', e.target.value)}
      />

      <Textarea
        label="Initial Messages (one per line)"
        placeholder={"Hi! How can I help you?\nFeel free to ask anything."}
        value={config.initial_message || ''}
        onChange={(e) => onUpdate('initial_message', e.target.value)}
        rows={3}
      />

      <div className="space-y-1">
        <Textarea
          label="Suggested Messages (one per line)"
          placeholder={"What do you do?\nHow can I get started?\nWhat are your prices?"}
          value={(config.suggested_messages || []).join('\n')}
          onChange={(e) =>
            onUpdate('suggested_messages', e.target.value.split('\n').filter(Boolean))
          }
          rows={4}
        />
        <label className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            checked={config.keep_suggestions_after_first || false}
            onChange={(e) => onUpdate('keep_suggestions_after_first', e.target.checked)}
            className="rounded border-border text-brand-600 focus:ring-primary/20"
          />
          <span className="text-sm text-muted-foreground">Keep after first interaction</span>
        </label>
      </div>

      <Input
        label="Message Placeholder"
        placeholder="Message..."
        value={config.message_placeholder || ''}
        onChange={(e) => onUpdate('message_placeholder', e.target.value)}
      />

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.collect_user_feedback || false}
            onChange={(e) => onUpdate('collect_user_feedback', e.target.checked)}
            className="rounded border-border text-brand-600 focus:ring-primary/20"
          />
          <span className="text-sm text-primary">Collect User Feedback (thumbs up/down)</span>
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.copy_messages || false}
          onChange={(e) => onUpdate('copy_messages', e.target.checked)}
          className="rounded border-border text-brand-600 focus:ring-primary/20"
        />
        <span className="text-sm text-primary">Allow Copy Messages</span>
      </label>

      <Textarea
        label="Dismissible Notice (markdown, shown once)"
        placeholder="By using this chat you agree to our Terms of Service."
        value={config.dismissible_notice || ''}
        onChange={(e) => onUpdate('dismissible_notice', e.target.value)}
        rows={3}
      />

      <Input
        label="Footer Text"
        placeholder="Powered by ChatFace"
        value={config.footer_text || ''}
        onChange={(e) => onUpdate('footer_text', e.target.value)}
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-primary">
          Auto-Show Delay (seconds, 0 = disabled)
        </label>
        <input
          type="number"
          min={0}
          value={config.auto_show_delay ?? 0}
          onChange={(e) => onUpdate('auto_show_delay', parseInt(e.target.value) || 0)}
          className="w-32 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.voice_to_text || false}
          onChange={(e) => onUpdate('voice_to_text', e.target.checked)}
          className="rounded border-border text-brand-600 focus:ring-primary/20"
        />
        <span className="text-sm text-primary">Voice to Text</span>
      </label>

      {/* Proactive Message */}
      <div className="border-t border-border pt-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-primary mb-0.5">Proactive Message</h4>
          <p className="text-xs text-muted">A floating speech bubble shown above the chat button to invite users to start chatting.</p>
        </div>
        <Input
          label="Message text"
          placeholder="👋 Hi! Have a question? I'm here to help."
          value={config.proactive_message || ''}
          onChange={(e) => onUpdate('proactive_message', e.target.value)}
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-primary">
            Delay before appearing (seconds)
          </label>
          <input
            type="number"
            min={0}
            value={config.proactive_message_delay ?? 3}
            onChange={(e) => onUpdate('proactive_message_delay', parseInt(e.target.value) || 0)}
            className="w-32 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Branding */}
      <div className="border-t border-border pt-5 space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-primary mb-0.5">Branding</h4>
          <p className="text-xs text-muted">Control the "Powered by Chatface" footer shown in your widget.</p>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.hide_branding || false}
            onChange={(e) => onUpdate('hide_branding', e.target.checked)}
            className="rounded border-border text-brand-600 focus:ring-primary/20"
          />
          <span className="text-sm text-primary">Remove "Powered by Chatface" branding</span>
        </label>
        {!config.hide_branding && (
          <Input
            label="Footer text (leave blank for default)"
            placeholder="Powered by Chatface"
            value={config.footer_text || ''}
            onChange={(e) => onUpdate('footer_text', e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
