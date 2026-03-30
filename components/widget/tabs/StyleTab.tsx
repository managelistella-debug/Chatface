'use client';

import { WidgetConfig } from '@/lib/types/database';
import { Input } from '@/components/ui/Input';

interface StyleTabProps {
  config: WidgetConfig;
  onUpdate: (field: keyof WidgetConfig, value: unknown) => void;
}

export function StyleTab({ config, onUpdate }: StyleTabProps) {
  return (
    <div className="space-y-5">
      {/* Theme */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-primary">Theme</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onUpdate('theme', 'light')}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
              (config.theme || 'light') === 'light'
                ? 'border-brand-600 bg-brand-50 text-brand-700 font-medium'
                : 'border-border text-muted-foreground hover:bg-surface-hover'
            }`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => onUpdate('theme', 'dark')}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
              config.theme === 'dark'
                ? 'border-brand-600 bg-brand-50 text-brand-700 font-medium'
                : 'border-border text-muted-foreground hover:bg-surface-hover'
            }`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Profile Picture URL */}
      <div className="space-y-2">
        <Input
          label="Profile Picture URL"
          placeholder="https://example.com/avatar.png"
          value={config.profile_picture_url || ''}
          onChange={(e) => onUpdate('profile_picture_url', e.target.value)}
        />
        {config.profile_picture_url && (
          <div className="flex items-center gap-2">
            <img
              src={config.profile_picture_url}
              alt="Profile preview"
              className="w-10 h-10 rounded-full object-cover border border-border"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-xs text-muted">Preview</span>
          </div>
        )}
      </div>

      {/* Chat Icon URL */}
      <div className="space-y-2">
        <Input
          label="Chat Icon URL (bubble icon)"
          placeholder="https://example.com/chat-icon.png"
          value={config.chat_icon_url || ''}
          onChange={(e) => onUpdate('chat_icon_url', e.target.value)}
        />
        {config.chat_icon_url && (
          <div className="flex items-center gap-2">
            <img
              src={config.chat_icon_url}
              alt="Chat icon preview"
              className="w-8 h-8 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-xs text-muted">Preview</span>
          </div>
        )}
      </div>

      {/* Primary Color */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-primary">Primary Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={config.primary_color || '#6366f1'}
            onChange={(e) => onUpdate('primary_color', e.target.value)}
            className="h-10 w-14 rounded border border-border cursor-pointer"
          />
          <input
            type="text"
            value={config.primary_color || '#6366f1'}
            onChange={(e) => onUpdate('primary_color', e.target.value)}
            placeholder="#6366f1"
            className="w-28 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
          />
        </div>
      </div>

      {/* Use Primary Color for Header */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.use_primary_for_header ?? true}
          onChange={(e) => onUpdate('use_primary_for_header', e.target.checked)}
          className="rounded border-border text-brand-600 focus:ring-primary/20"
        />
        <span className="text-sm text-primary">Use Primary Color for Header</span>
      </label>

      {/* Bubble Button Color */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-primary">Bubble Button Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={config.bubble_color || config.primary_color || '#6366f1'}
            onChange={(e) => onUpdate('bubble_color', e.target.value)}
            className="h-10 w-14 rounded border border-border cursor-pointer"
          />
          <input
            type="text"
            value={config.bubble_color || config.primary_color || '#6366f1'}
            onChange={(e) => onUpdate('bubble_color', e.target.value)}
            placeholder="#6366f1"
            className="w-28 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
          />
        </div>
      </div>

      {/* Bubble Alignment */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-primary">Bubble Alignment</label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="bubble_alignment"
              checked={(config.bubble_alignment || 'right') === 'left'}
              onChange={() => onUpdate('bubble_alignment', 'left')}
              className="text-brand-600 focus:ring-primary/20"
            />
            <span className="text-sm text-primary">Left</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="bubble_alignment"
              checked={(config.bubble_alignment || 'right') === 'right'}
              onChange={() => onUpdate('bubble_alignment', 'right')}
              className="text-brand-600 focus:ring-primary/20"
            />
            <span className="text-sm text-primary">Right</span>
          </label>
        </div>
      </div>
    </div>
  );
}
