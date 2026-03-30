'use client';

import { useState } from 'react';
import { Agent, WidgetConfig as WidgetConfigType } from '@/lib/types/database';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { ContentTab } from './tabs/ContentTab';
import { StyleTab } from './tabs/StyleTab';
import { AITab } from './tabs/AITab';
import { EmbedTab } from './tabs/EmbedTab';
import { ChatPlayground } from '@/components/chat/ChatPlayground';

const TABS = ['Content', 'Style', 'AI', 'Embed'] as const;

export function WidgetConfig({ agent }: { agent: Agent }) {
  const [config, setConfig] = useState<WidgetConfigType>(agent.widget_config || {});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Content');

  function onUpdate(field: keyof WidgetConfigType, value: unknown) {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widget_config: config }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      toast('Widget config saved', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Config Panel — scrollable */}
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-border p-6 overflow-y-auto max-h-[calc(100vh-160px)]">
        {/* Sub-tabs */}
        <div className="flex gap-1 mb-6 bg-surface-hover rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'Content' && <ContentTab config={config} onUpdate={onUpdate} />}
          {activeTab === 'Style' && <StyleTab config={config} onUpdate={onUpdate} />}
          {activeTab === 'AI' && <AITab config={config} onUpdate={onUpdate} />}
          {activeTab === 'Embed' && <EmbedTab config={config} agentId={agent.id} onUpdate={onUpdate} />}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Widget Config'}
          </Button>
        </div>
      </div>

      {/* Live Chat Preview — sticky */}
      <div className="w-[360px] shrink-0 sticky top-0 self-start">
        <p className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Preview</p>
        <div style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}>
          <ChatPlayground
            agentId={agent.id}
            widgetConfig={config}
            displayName={config.display_name || agent.name}
          />
        </div>
      </div>
    </div>
  );
}
