'use client';

import { useEffect, useState } from 'react';
import { Conversation, Message } from '@/lib/types/database';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import ReactMarkdown from 'react-markdown';

interface ConversationWithMessages extends Conversation {
  messages: Message[];
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
  return new Date(dateStr).toLocaleString();
}

export function ConversationViewer({
  conversationId,
  onUpdated,
}: {
  conversationId: string;
  onUpdated?: () => void;
}) {
  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'details'>('chat');
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctedText, setCorrectedText] = useState('');
  const [savingCorrection, setSavingCorrection] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/conversations/${conversationId}`)
      .then((r) => r.json())
      .then((j) => { setConversation(j.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [conversationId]);

  async function toggleTakeover() {
    if (!conversation) return;
    try {
      const res = await fetch(`/api/conversations/${conversationId}/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_human_takeover: !conversation.is_human_takeover }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setConversation((prev) => prev ? { ...prev, ...json.data, messages: prev.messages } : prev);
      toast(json.data.is_human_takeover ? 'Human takeover enabled' : 'AI resumed', 'success');
      onUpdated?.();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  function startCorrection(msg: Message) {
    setCorrectingId(msg.id);
    setCorrectedText(msg.content);
  }

  async function saveCorrection(messageId: string) {
    if (!correctedText.trim()) return;
    setSavingCorrection(true);
    try {
      const res = await fetch(`/api/messages/${messageId}/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrected_answer: correctedText.trim() }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === messageId ? { ...m, is_corrected: true } : m
          ),
        };
      });
      setCorrectingId(null);
      toast('Correction saved to Q&A', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSavingCorrection(false);
    }
  }

  async function handleFeedback(messageId: string, feedback: 'thumbs_up' | 'thumbs_down') {
    try {
      await fetch(`/api/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      setConversation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) => m.id === messageId ? { ...m, feedback } : m),
        };
      });
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted">
        Loading...
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted">
        Conversation not found
      </div>
    );
  }

  const aiMessages = conversation.messages.filter((m) => m.role === 'assistant');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Conversation content</p>
          {conversation.title && (
            <p className="text-xs text-muted mt-0.5 truncate max-w-[360px]">{conversation.title}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {conversation.sentiment && (
            <Badge variant={
              conversation.sentiment === 'positive' ? 'success' :
              conversation.sentiment === 'negative' ? 'error' : 'default'
            }>
              {conversation.sentiment}
            </Badge>
          )}
          <button
            onClick={toggleTakeover}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
              conversation.is_human_takeover
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-surface-hover text-muted hover:bg-border'
            }`}
          >
            {conversation.is_human_takeover ? 'Resume AI' : 'Human Takeover'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0 px-5">
        <button
          onClick={() => setActiveTab('chat')}
          className={`py-2.5 text-xs font-medium mr-4 border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-muted hover:text-primary'
          }`}
        >
          Chat view
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'details'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-muted hover:text-primary'
          }`}
        >
          Details
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chat' ? (
          <div className="p-5 space-y-5">
            {conversation.messages.map((msg, i) => (
              <div key={msg.id}>
                {/* Role label + timestamp */}
                <div className={`flex items-center gap-2 mb-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <>
                      <span className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </span>
                      <span className="text-[11px] text-muted">{relativeTime(msg.created_at)}</span>
                      {/* AI message count label */}
                      {i === conversation.messages.findIndex((m) => m.role === 'assistant') && (
                        <span className="text-[10px] text-muted bg-surface-hover px-1.5 py-0.5 rounded-full">
                          {aiMessages.length} AI response{aiMessages.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </>
                  )}
                  {msg.role === 'user' && (
                    <span className="text-[11px] text-muted">{relativeTime(msg.created_at)}</span>
                  )}
                </div>

                {/* Bubble */}
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-brand-600 text-white'
                        : 'bg-surface-hover text-primary'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="mb-2 last:mb-0 space-y-1 pl-1">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-2 last:mb-0 space-y-1 pl-1 list-decimal list-inside">{children}</ol>,
                          li: ({ children }) => (
                            <li className="flex items-start gap-2">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
                              <span>{children}</span>
                            </li>
                          ),
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>

                {/* Feedback + sources (assistant only) */}
                {msg.role === 'assistant' && (
                  <div className="mt-1.5 pl-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleFeedback(msg.id, 'thumbs_up')}
                        className={`text-xs transition-colors ${
                          msg.feedback === 'thumbs_up' ? 'text-green-600' : 'text-muted hover:text-green-600'
                        }`}
                        title="Good response"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, 'thumbs_down')}
                        className={`text-xs transition-colors ${
                          msg.feedback === 'thumbs_down' ? 'text-red-600' : 'text-muted hover:text-red-600'
                        }`}
                        title="Bad response"
                      >
                        👎
                      </button>

                      {/* Fix this answer */}
                      {(msg as Message & { is_corrected?: boolean }).is_corrected ? (
                        <span className="text-[11px] text-green-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Corrected
                        </span>
                      ) : (
                        <button
                          onClick={() => startCorrection(msg)}
                          className="text-[11px] text-muted hover:text-amber-600 transition-colors flex items-center gap-1"
                          title="Fix this answer"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Fix answer
                        </button>
                      )}

                      {msg.sources && msg.sources.length > 0 && (
                        <details className="inline">
                          <summary className="text-[11px] text-brand-600 cursor-pointer list-none hover:underline">
                            {msg.sources.length} source{msg.sources.length !== 1 ? 's' : ''}
                          </summary>
                          <div className="mt-2 space-y-1">
                            {msg.sources.map((src, si) => (
                              <div key={si} className="text-xs bg-white border border-border rounded-lg p-2.5">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-primary">{src.data_source_name}</span>
                                  <span className="text-muted text-[10px]">{(src.similarity * 100).toFixed(0)}% match</span>
                                </div>
                                <p className="text-muted line-clamp-2">{src.content_preview}…</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>

                    {/* Inline correction editor */}
                    {correctingId === msg.id && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                        <p className="text-[11px] font-semibold text-amber-800">Edit correct answer — will be saved to Q&A</p>
                        <textarea
                          value={correctedText}
                          onChange={(e) => setCorrectedText(e.target.value)}
                          rows={4}
                          className="w-full text-xs border border-amber-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveCorrection(msg.id)}
                            disabled={savingCorrection || !correctedText.trim()}
                            className="text-xs font-medium px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                          >
                            {savingCorrection ? 'Saving…' : 'Save to Q&A'}
                          </button>
                          <button
                            onClick={() => setCorrectingId(null)}
                            className="text-xs font-medium px-3 py-1.5 text-muted hover:text-primary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Details tab */
          <div className="p-5 space-y-4">
            <div className="bg-surface-hover rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Started</span>
                <span className="font-medium">{new Date(conversation.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Messages</span>
                <span className="font-medium">{conversation.messages.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">AI responses</span>
                <span className="font-medium">{aiMessages.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Status</span>
                <span className="font-medium">
                  {conversation.is_human_takeover ? '🧑 Human takeover' : '🤖 AI'}
                </span>
              </div>
              {conversation.sentiment && (
                <div className="flex justify-between">
                  <span className="text-muted">Sentiment</span>
                  <span className="font-medium capitalize">{conversation.sentiment}</span>
                </div>
              )}
            </div>

            {conversation.metadata && Object.keys(conversation.metadata).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">Metadata</p>
                <div className="bg-surface-hover rounded-xl p-4 space-y-2 text-sm">
                  {Object.entries(conversation.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted">{key}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
