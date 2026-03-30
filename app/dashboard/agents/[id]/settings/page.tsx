'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Agent } from '@/lib/types/database';
import { AgentForm } from '@/components/dashboard/AgentForm';
import { GuardrailsForm } from '@/components/dashboard/GuardrailsForm';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((r) => { setAgent(r.data || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      toast('Agent deleted', 'success');
      router.push('/dashboard');
    } catch {
      toast('Failed to delete', 'error');
      setDeleting(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" /></div>;
  if (!agent) return <div className="p-8 text-muted">Agent not found</div>;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-2xl font-semibold text-primary">Settings</h1>
      </div>
      <div className="px-8 py-6 space-y-8">
        <AgentForm agent={agent} />

        {/* Guardrails */}
        <div className="border border-border rounded-xl p-6 space-y-1 max-w-2xl">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-primary">Conversation Guardrails</h3>
            <p className="text-xs text-muted mt-1">
              Control how strictly the agent stays within your provided knowledge. Stricter settings
              produce more accurate, on-brand answers and save tokens.
            </p>
          </div>
          <GuardrailsForm agentId={agent.id} initial={agent.guardrails ?? null} />
        </div>

        {/* Danger zone */}
        <div className="border border-destructive/20 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h3>
          <p className="text-sm text-muted mb-4">Permanently delete this agent and all its data. This cannot be undone.</p>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            Delete Agent
          </Button>
        </div>
      </div>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Delete Agent">
        <p className="text-sm text-muted mb-4">
          This will permanently delete <strong>{agent.name}</strong>, all its data sources, conversations, and leads. This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Forever'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
