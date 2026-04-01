'use client';

import { useEffect, useState, use } from 'react';
import { Agent } from '@/lib/types/database';
import { ChatPlayground } from '@/components/chat/ChatPlayground';
import { AgentForm } from '@/components/dashboard/AgentForm';
import Link from 'next/link';

export default function AgentPlaygroundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Settings' | 'Preview'>('Settings');
  const [indexingCount, setIndexingCount] = useState(0);

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((r) => { setAgent(r.data || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  // Poll data sources to check if any are still indexing
  useEffect(() => {
    function checkIndexing() {
      fetch(`/api/data-sources?agent_id=${id}`)
        .then((r) => r.json())
        .then((j) => {
          const processing = (j.data || []).filter(
            (s: { status: string }) => s.status === 'pending' || s.status === 'processing'
          ).length;
          setIndexingCount(processing);
        })
        .catch(() => {});
    }
    checkIndexing();
    const interval = setInterval(checkIndexing, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return <PageSkeleton />;
  if (!agent) return <div className="p-8 text-muted">Agent not found</div>;

  const chatPanel = (
    <div className="flex flex-col h-full">
      {/* Indexing banner */}
      {indexingCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs">
          <span className="w-3 h-3 border-2 border-amber-400 border-t-amber-700 rounded-full animate-spin shrink-0" />
          <span>
            {indexingCount} data source{indexingCount > 1 ? 's are' : ' is'} still indexing — responses may not reflect this content yet.{' '}
            <Link href={`/dashboard/agents/${id}/sources`} className="font-semibold underline">
              View status
            </Link>
          </span>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <ChatPlayground agentId={id} widgetConfig={agent.widget_config} leadCaptureConfig={agent.lead_capture ?? null} displayName={agent.widget_config?.display_name || agent.name} />
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Settings / Preview panel */}
      <div className="flex-1 flex flex-col border-r border-border">
        {/* Page heading + tab header */}
        <div className="border-b border-border">
          <div className="px-8 pt-6 pb-0">
            <h1 className="text-2xl font-semibold text-primary mb-4">Playground</h1>
          </div>
          <div className="flex items-center gap-6 px-8">
            {(['Settings', 'Preview'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {activeTab === 'Settings' && <AgentForm agent={agent} />}
          {activeTab === 'Preview' && chatPanel}
        </div>
      </div>

      {/* Right preview (always visible on desktop) */}
      <div className="hidden xl:flex w-[420px] flex-col bg-surface-hover/30">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-primary">Preview</h3>
        </div>
        <div className="flex-1 overflow-hidden">
          {chatPanel}
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );
}
