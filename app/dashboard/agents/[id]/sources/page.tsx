'use client';

import { use, useState, useCallback } from 'react';
import { DataSourceUpload } from '@/components/dashboard/DataSourceUpload';
import { DataSourceList } from '@/components/dashboard/DataSourceList';
import { QAPairManager } from '@/components/dashboard/QAPairManager';
import { toast } from '@/components/ui/Toast';

export default function DataSourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [retraining, setRetraining] = useState(false);
  const [needsRetrain, setNeedsRetrain] = useState(false);
  const [sourceCount, setSourceCount] = useState(0);

  // Called by DataSourceList when sources load/change
  const handleSourcesLoaded = useCallback((count: number) => {
    setSourceCount(count);
  }, []);

  // Called by DataSourceUpload when a new source is added
  const handleSourceAdded = useCallback(() => {
    setNeedsRetrain(false); // source was just added & processed — no banner needed until next change
  }, []);

  async function handleRetrain() {
    setRetraining(true);
    try {
      const res = await fetch(`/api/agents/${id}/retrain`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Retrain failed');
      toast(`Retraining ${json.data.reprocessed} source(s)…`, 'success');
      setNeedsRetrain(false);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setRetraining(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 border-b border-border flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">Data Sources</h1>
        {sourceCount > 0 && (
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {retraining ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Retraining…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Retrain
              </>
            )}
          </button>
        )}
      </div>

      {/* Out-of-date banner */}
      {needsRetrain && (
        <div className="mx-8 mt-4 flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Your chatbot is out of date. Click <strong>Retrain</strong> to apply the latest changes.
          </div>
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-md bg-amber-800 text-white hover:bg-amber-900 disabled:opacity-50 transition-colors"
          >
            Retrain now
          </button>
        </div>
      )}

      <div className="px-8 py-6 space-y-6">
        <DataSourceUpload agentId={id} onUploaded={handleSourceAdded} />
        <DataSourceList agentId={id} onSourcesLoaded={handleSourcesLoaded} onSourceDeleted={() => setNeedsRetrain(true)} />
        <QAPairManager agentId={id} />
      </div>
    </div>
  );
}
