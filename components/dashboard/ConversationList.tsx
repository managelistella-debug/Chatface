'use client';

import { useEffect, useState, useCallback } from 'react';
import { Conversation } from '@/lib/types/database';
import { ConversationViewer } from './ConversationViewer';

interface EnrichedConversation extends Conversation {
  ai_preview: string | null;
  message_count: number;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ConversationList({ agentId }: { agentId: string }) {
  const [conversations, setConversations] = useState<EnrichedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchConversations = useCallback(() => {
    fetch(`/api/conversations?agent_id=${agentId}`)
      .then((r) => r.json())
      .then((j) => {
        const list = j.data || [];
        setConversations(list);
        // Auto-select the first conversation
        if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [agentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const filtered = conversations.filter((c) =>
    (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted">
        Loading conversations...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-center">
        <div className="text-3xl">💬</div>
        <p className="text-sm font-medium text-primary">No conversations yet</p>
        <p className="text-xs text-muted">Conversations will appear here once users start chatting.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Left panel — conversation list */}
      <div className="w-[320px] shrink-0 border-r border-border flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-white placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-4 text-xs text-muted text-center">No results</p>
          ) : (
            filtered.map((conv) => {
              const isSelected = conv.id === selectedId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${
                    isSelected
                      ? 'bg-brand-50 border-l-2 border-l-brand-600'
                      : 'hover:bg-surface-hover'
                  }`}
                >
                  {/* AI preview snippet */}
                  {conv.ai_preview && (
                    <p className="text-xs text-muted line-clamp-2 mb-1">
                      {conv.ai_preview.slice(0, 120)}{conv.ai_preview.length > 120 ? '…' : ''}
                    </p>
                  )}

                  {/* Timestamp row */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-muted">
                      {relativeTime(conv.updated_at || conv.created_at)}
                    </span>
                    {conv.message_count > 0 && (
                      <span className="text-[10px] text-muted bg-surface-hover px-1.5 py-0.5 rounded-full">
                        {conv.message_count} msg{conv.message_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* User first message */}
                  <p className="text-xs font-medium text-primary truncate">
                    {conv.title || 'Untitled conversation'}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel — conversation thread */}
      <div className="flex-1 min-w-0">
        {selectedId ? (
          <ConversationViewer
            key={selectedId}
            conversationId={selectedId}
            onUpdated={fetchConversations}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted">
            Select a conversation to view
          </div>
        )}
      </div>
    </div>
  );
}
