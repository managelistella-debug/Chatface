'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { DataSource } from '@/lib/types/database';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  pending: 'default',
  processing: 'warning',
  completed: 'success',
  failed: 'error',
};

interface DataSourceListProps {
  agentId: string;
  onSourcesLoaded?: (count: number) => void;
  onSourceDeleted?: () => void;
}

export function DataSourceList({ agentId, onSourcesLoaded, onSourceDeleted }: DataSourceListProps) {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  // Track previous statuses so we can toast on completion
  const prevStatuses = useRef<Record<string, string>>({});

  const fetchSources = useCallback(() => {
    fetch(`/api/data-sources?agent_id=${agentId}`)
      .then((res) => res.json())
      .then((json) => {
        const data: DataSource[] = json.data || [];
        // Detect any sources that just became 'completed'
        data.forEach((s) => {
          const prev = prevStatuses.current[s.id];
          if (prev && prev !== 'completed' && s.status === 'completed') {
            toast(`"${s.name}" finished indexing — ready to use!`, 'success');
          }
          if (s.status === 'failed' && prev && prev !== 'failed') {
            toast(`"${s.name}" failed to index: ${s.error_message || 'unknown error'}`, 'error');
          }
          prevStatuses.current[s.id] = s.status;
        });
        setSources(data);
        setLoading(false);
        onSourcesLoaded?.(data.length);
      })
      .catch(() => setLoading(false));
  }, [agentId, onSourcesLoaded]);

  useEffect(() => {
    fetchSources();
    // Poll for status updates every 5 seconds
    const interval = setInterval(fetchSources, 5000);
    return () => clearInterval(interval);
  }, [fetchSources]);

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/data-sources/${id}`, { method: 'DELETE' });
      toast('Data source deleted', 'success');
      onSourceDeleted?.();
      fetchSources();
    } catch {
      toast('Failed to delete', 'error');
    }
  }

  async function toggleAutoSync(source: DataSource) {
    const newValue = !(source as DataSource & { auto_sync?: boolean }).auto_sync;
    try {
      const res = await fetch(`/api/data-sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_sync: newValue }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSources((prev) => prev.map((s) => s.id === source.id ? { ...s, ...(json.data as object) } : s));
      toast(newValue ? 'Auto-sync enabled' : 'Auto-sync disabled', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  if (loading) return <div className="text-sm text-muted">Loading data sources...</div>;
  if (sources.length === 0) return <div className="text-sm text-muted">No data sources yet.</div>;

  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-semibold text-primary">Data Sources ({sources.length})</h3>
      </div>
      <ul className="divide-y divide-border">
        {sources.map((source) => (
          <li key={source.id} className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Spinner for in-progress sources */}
              {(source.status === 'pending' || source.status === 'processing') ? (
                <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin shrink-0" />
              ) : source.status === 'completed' ? (
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary truncate">{source.name}</p>
                <p className="text-xs text-muted mt-0.5">
                  {source.type.toUpperCase()}
                  {source.status === 'completed' && ` · ${source.total_chunks} chunks · ${source.total_tokens.toLocaleString()} tokens`}
                  {source.status === 'processing' && ' · Indexing…'}
                  {source.status === 'pending' && ' · Waiting to index…'}
                </p>
                {source.error_message && (
                  <p className="text-xs text-red-600 mt-0.5">{source.error_message}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {source.type === 'url' && source.status === 'completed' && (
                <button
                  onClick={() => toggleAutoSync(source)}
                  title={(source as DataSource & { auto_sync?: boolean }).auto_sync ? 'Auto-sync on' : 'Auto-sync off'}
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                    (source as DataSource & { auto_sync?: boolean }).auto_sync
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-surface-hover text-muted hover:bg-border'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {(source as DataSource & { auto_sync?: boolean }).auto_sync ? 'Auto-sync on' : 'Auto-sync'}
                </button>
              )}
              <Badge variant={STATUS_VARIANT[source.status]}>{source.status}</Badge>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(source.id)}>
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
