'use client';

import { use, useState } from 'react';
import { ConversationList } from '@/components/dashboard/ConversationList';
import { TopicsAnalysis } from '@/components/dashboard/TopicsAnalysis';
import { SuggestionsPanel } from '@/components/dashboard/SuggestionsPanel';

type Tab = 'logs' | 'topics' | 'suggestions';

export default function ConversationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>('logs');
  const [exporting, setExporting] = useState(false);

  async function handleExport(format: 'csv' | 'json') {
    setExporting(true);
    try {
      const res = await fetch(`/api/agents/${id}/conversations/export?format=${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversations.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header + tabs */}
      <div className="px-8 pt-5 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-primary">Activity</h1>

          {/* Export dropdown */}
          <div className="relative group">
            <button
              disabled={exporting}
              className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-primary border border-border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exporting ? 'Exporting…' : 'Export'}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-border rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left text-xs text-primary px-3 py-2 hover:bg-surface-hover rounded-t-lg"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left text-xs text-primary px-3 py-2 hover:bg-surface-hover rounded-b-lg"
              >
                Export as JSON
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {(
            [
              { id: 'logs', label: 'Chat logs' },
              { id: 'topics', label: 'Topics', ai: true },
              { id: 'suggestions', label: 'Suggestions', ai: true },
            ] as { id: Tab; label: string; ai?: boolean }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-muted hover:text-primary'
              }`}
            >
              {tab.label}
              {tab.ai && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600">
                  AI
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'logs' && <ConversationList agentId={id} />}
        {activeTab === 'topics' && (
          <div className="h-full overflow-y-auto">
            <TopicsAnalysis agentId={id} />
          </div>
        )}
        {activeTab === 'suggestions' && (
          <div className="h-full overflow-y-auto">
            <SuggestionsPanel agentId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
