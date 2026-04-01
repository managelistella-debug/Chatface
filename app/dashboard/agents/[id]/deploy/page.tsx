'use client';

import { useEffect, useState, use } from 'react';
import { Agent } from '@/lib/types/database';
import { WidgetConfig } from '@/components/widget/WidgetConfig';
import { HelpPageConfig } from '@/components/dashboard/HelpPageConfig';
import { ChannelIntegrations } from '@/components/dashboard/ChannelIntegrations';

export default function DeployPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Widget' | 'Channels' | 'Help Page'>(() => {
    // Default to Channels tab if redirected from OAuth
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('tab') === 'Channels') return 'Channels';
    }
    return 'Widget';
  });

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((r) => { setAgent(r.data || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" /></div>;
  if (!agent) return <div className="p-8 text-muted">Agent not found</div>;

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs */}
      <div className="flex items-center gap-6 px-8 border-b border-border shrink-0">
        {(['Widget', 'Channels', 'Help Page'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 pt-4 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        {activeTab === 'Widget' && <WidgetConfig agent={agent} />}
        {activeTab === 'Channels' && <ChannelIntegrations agentId={id} />}
        {activeTab === 'Help Page' && <HelpPageConfig agentId={id} agentName={agent.name} />}
      </div>
    </div>
  );
}
