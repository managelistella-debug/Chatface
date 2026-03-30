'use client';

import { useEffect, useState, useCallback } from 'react';
import { AIAction } from '@/lib/types/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';

const ACTION_TYPES = [
  { value: 'lead_collection', label: 'Lead Collection' },
  { value: 'web_search', label: 'Web Search' },
];

export function AIActionsManager({ agentId }: { agentId: string }) {
  const [actions, setActions] = useState<AIAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState('lead_collection');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWebhookUrl, setFormWebhookUrl] = useState('');
  const [formMaxResults, setFormMaxResults] = useState(5);

  const fetchActions = useCallback(() => {
    fetch(`/api/ai-actions?agent_id=${agentId}`)
      .then((r) => r.json())
      .then((j) => { setActions(j.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agentId]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  function resetForm() {
    setFormType('lead_collection');
    setFormName('');
    setFormDescription('');
    setFormWebhookUrl('');
    setFormMaxResults(5);
    setEditingId(null);
  }

  function openEdit(action: AIAction) {
    setFormType(action.type);
    setFormName(action.name);
    setFormDescription(action.description);
    const cfg = action.config as unknown as Record<string, unknown>;
    setFormWebhookUrl((cfg?.webhook_url as string) || '');
    setFormMaxResults((cfg?.max_results as number) || 5);
    setEditingId(action.id);
    setShowAdd(true);
  }

  async function handleSave() {
    if (!formName.trim()) return;

    const config = formType === 'lead_collection'
      ? { fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'email', required: true },
          { name: 'phone', type: 'tel', required: false },
        ], webhook_url: formWebhookUrl || undefined }
      : { max_results: formMaxResults };

    const body = { agent_id: agentId, type: formType, name: formName.trim(), description: formDescription, config };

    try {
      const url = editingId ? `/api/ai-actions/${editingId}` : '/api/ai-actions';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      toast(editingId ? 'Action updated' : 'Action created', 'success');
      setShowAdd(false);
      resetForm();
      fetchActions();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  async function toggleEnabled(action: AIAction) {
    await fetch(`/api/ai-actions/${action.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: !action.is_enabled }),
    });
    fetchActions();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/ai-actions/${id}`, { method: 'DELETE' });
    toast('Action deleted', 'success');
    fetchActions();
  }

  if (loading) return <div className="text-sm text-muted">Loading actions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary">AI Actions ({actions.length})</h3>
        <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }}>Add Action</Button>
      </div>

      {actions.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-sm text-muted">
          No AI Actions configured yet. Add lead collection or web search to enhance your agent.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border divide-y divide-border">
          {actions.map((action) => (
            <div key={action.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-primary">{action.name}</p>
                  <Badge variant={action.type === 'lead_collection' ? 'success' : 'default'}>
                    {action.type === 'lead_collection' ? 'Lead Collection' : 'Web Search'}
                  </Badge>
                </div>
                {action.description && <p className="text-xs text-muted mt-1">{action.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleEnabled(action)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${action.is_enabled ? 'bg-brand-600' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${action.is_enabled ? 'left-5' : 'left-0.5'}`} />
                </button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(action)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(action.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetForm(); }} title={editingId ? 'Edit Action' : 'Add Action'}>
        <div className="space-y-4">
          <Select label="Action Type" options={ACTION_TYPES} value={formType} onChange={(e) => setFormType(e.target.value)} />
          <Input label="Action Name" placeholder="e.g. Collect Lead Info" value={formName} onChange={(e) => setFormName(e.target.value)} />
          <Textarea label="Trigger Description" placeholder="Describe when the AI should use this action..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} />

          {formType === 'lead_collection' && (
            <Input label="Webhook URL (optional)" placeholder="https://..." value={formWebhookUrl} onChange={(e) => setFormWebhookUrl(e.target.value)} />
          )}

          {formType === 'web_search' && (
            <Input label="Max Results" type="number" value={String(formMaxResults)} onChange={(e) => setFormMaxResults(parseInt(e.target.value) || 5)} />
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>{editingId ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
