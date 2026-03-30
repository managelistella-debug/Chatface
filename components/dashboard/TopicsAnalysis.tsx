'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/Toast';
import type { TopicItem } from '@/app/api/agents/[id]/topics/route';

interface TopicsAnalysisProps {
  agentId: string;
}

function OverlapBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      {name}
    </span>
  );
}

export function TopicsAnalysis({ agentId }: TopicsAnalysisProps) {
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [addingId, setAddingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/topics`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setTopics(json.data?.topics || []);
      setTotalMessages(json.data?.total_messages || 0);
      setLoaded(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Auto-load on first mount
  useEffect(() => { analyze(); }, [analyze]);

  async function addToQA(topic: TopicItem, index: number) {
    setAddingId(index);
    try {
      const res = await fetch('/api/qa-pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          question: topic.suggested_qa.question,
          answer: topic.suggested_qa.answer,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAddedIds((prev) => new Set([...prev, index]));
      toast(`Added "${topic.name}" to Q&A`, 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setAddingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-primary">Analysing conversation topics…</p>
        <p className="text-xs text-muted">This may take a few seconds</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={analyze}
          className="text-xs text-brand-600 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (loaded && topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
        <div className="text-3xl">💬</div>
        <p className="text-sm font-medium text-primary">Not enough data yet</p>
        <p className="text-xs text-muted">Topics will appear once your agent has had at least a few conversations.</p>
      </div>
    );
  }

  // Max count for bar scaling
  const maxCount = Math.max(...topics.map((t) => t.count), 1);

  return (
    <div className="p-6 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            {topics.length} topic{topics.length !== 1 ? 's' : ''} detected
          </p>
          <p className="text-xs text-muted mt-0.5">
            Analysed from {totalMessages} unique user messages · Sorted most → least common
          </p>
        </div>
        <button
          onClick={analyze}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Topic cards */}
      <div className="space-y-3">
        {topics.map((topic, i) => {
          const isExpanded = expandedId === i;
          const isAdded = addedIds.has(i);
          const isAdding = addingId === i;
          const barWidth = Math.round((topic.count / maxCount) * 100);

          return (
            <div
              key={i}
              className="bg-white rounded-xl border border-border overflow-hidden"
            >
              {/* Top section — always visible */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Topic name + rank */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-muted bg-surface-hover px-1.5 py-0.5 rounded">
                        #{i + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-primary">{topic.name}</h3>
                    </div>

                    {/* Frequency bar */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-600 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted shrink-0">
                        {topic.count} msg{topic.count !== 1 ? 's' : ''}
                        {topic.percentage > 0 && ` · ${topic.percentage}%`}
                      </span>
                    </div>

                    {/* Overlap badges */}
                    {topic.overlaps_with && topic.overlaps_with.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-[10px] text-muted">Overlaps:</span>
                        {topic.overlaps_with.map((name, oi) => (
                          <OverlapBadge key={oi} name={name} />
                        ))}
                      </div>
                    )}

                    {/* Sample questions */}
                    {topic.sample_questions && topic.sample_questions.length > 0 && (
                      <div className="space-y-0.5">
                        {topic.sample_questions.slice(0, isExpanded ? undefined : 2).map((q, qi) => (
                          <p key={qi} className="text-xs text-muted flex items-start gap-1.5">
                            <span className="mt-0.5 w-1 h-1 rounded-full bg-muted shrink-0" />
                            <span className="italic">"{q}"</span>
                          </p>
                        ))}
                        {!isExpanded && topic.sample_questions.length > 2 && (
                          <button
                            onClick={() => setExpandedId(i)}
                            className="text-[11px] text-brand-600 hover:underline ml-2.5"
                          >
                            +{topic.sample_questions.length - 2} more
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Suggested Q&A section */}
              <div className="border-t border-border bg-surface-hover/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1.5">
                      ✦ Suggested Q&A
                    </p>
                    <p className="text-xs font-medium text-primary mb-1">
                      Q: {topic.suggested_qa.question}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      A: {isExpanded
                        ? topic.suggested_qa.answer
                        : topic.suggested_qa.answer.length > 120
                          ? topic.suggested_qa.answer.slice(0, 120) + '…'
                          : topic.suggested_qa.answer}
                    </p>
                    {topic.suggested_qa.answer.length > 120 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : i)}
                        className="text-[11px] text-brand-600 hover:underline mt-0.5"
                      >
                        {isExpanded ? 'Show less' : 'Show full answer'}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => addToQA(topic, i)}
                    disabled={isAdded || isAdding}
                    className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      isAdded
                        ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                        : 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50'
                    }`}
                  >
                    {isAdding ? (
                      <>
                        <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                        Adding…
                      </>
                    ) : isAdded ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Added
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add to Q&A
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
