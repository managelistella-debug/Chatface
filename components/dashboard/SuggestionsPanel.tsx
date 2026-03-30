'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/Toast';
import type { SuggestionItem } from '@/app/api/agents/[id]/suggestions/route';

interface SuggestionsPanelProps {
  agentId: string;
}

export function SuggestionsPanel({ agentId }: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [addingId, setAddingId] = useState<number | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/suggestions`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSuggestions(json.data?.suggestions || []);
      setTotal(json.data?.total || 0);
      setLoaded(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { analyze(); }, [analyze]);

  async function addToQA(s: SuggestionItem, i: number) {
    setAddingId(i);
    try {
      const res = await fetch('/api/qa-pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          question: s.suggested_qa.question,
          answer: s.suggested_qa.answer,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAddedIds((prev) => new Set([...prev, i]));
      toast('Added to Q&A', 'success');
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
        <p className="text-sm font-medium text-primary">Analysing failed responses…</p>
        <p className="text-xs text-muted">Looking for patterns in thumbs-down feedback</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={analyze} className="text-xs text-brand-600 underline hover:no-underline">Try again</button>
      </div>
    );
  }

  if (loaded && suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
        <div className="text-3xl">✅</div>
        <p className="text-sm font-medium text-primary">
          {total === 0 ? 'No negative feedback yet' : 'No patterns found'}
        </p>
        <p className="text-xs text-muted max-w-xs">
          {total === 0
            ? 'Suggestions appear here once users give thumbs-down to bot responses.'
            : `Analysed ${total} flagged message${total !== 1 ? 's' : ''} — no clear knowledge gaps detected yet.`}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            {suggestions.length} knowledge gap{suggestions.length !== 1 ? 's' : ''} identified
          </p>
          <p className="text-xs text-muted mt-0.5">
            Based on {total} thumbs-down message{total !== 1 ? 's' : ''} · Add suggested Q&A pairs to fix gaps
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

      <div className="space-y-3">
        {suggestions.map((s, i) => {
          const isAdded = addedIds.has(i);
          const isAdding = addingId === i;
          return (
            <div key={i} className="bg-white rounded-xl border border-border overflow-hidden">
              {/* Header */}
              <div className="p-4">
                <div className="flex items-start gap-3 mb-2">
                  <span className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 shrink-0">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary">"{s.user_question}"</p>
                    <p className="text-xs text-muted mt-0.5">
                      {s.count} similar message{s.count !== 1 ? 's' : ''}
                      {s.similar_questions.length > 0 && ` including: "${s.similar_questions[0]}"`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Suggested fix */}
              <div className="border-t border-border bg-surface-hover/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1.5">
                      ✦ Suggested fix
                    </p>
                    <p className="text-xs font-medium text-primary mb-1">
                      Q: {s.suggested_qa.question}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      A: {s.suggested_qa.answer}
                    </p>
                  </div>
                  <button
                    onClick={() => addToQA(s, i)}
                    disabled={isAdded || isAdding}
                    className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      isAdded
                        ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                        : 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50'
                    }`}
                  >
                    {isAdding ? (
                      <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />Adding…</>
                    ) : isAdded ? (
                      <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Added</>
                    ) : (
                      <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add to Q&A</>
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
