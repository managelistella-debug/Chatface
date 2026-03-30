'use client';

import { useEffect, useState, useCallback } from 'react';
import { Lead } from '@/lib/types/database';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

export function LeadsList({ agentId }: { agentId: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(() => {
    fetch(`/api/leads?agent_id=${agentId}`)
      .then((r) => r.json())
      .then((j) => { setLeads(j.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agentId]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function handleExport() {
    window.open(`/api/leads/export?agent_id=${agentId}`, '_blank');
  }

  async function handleDelete(id: string) {
    await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    toast('Lead deleted', 'success');
    fetchLeads();
  }

  if (loading) return <div className="text-sm text-muted">Loading leads...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary">Leads ({leads.length})</h3>
        {leads.length > 0 && (
          <Button variant="secondary" size="sm" onClick={handleExport}>Export CSV</Button>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-sm text-muted">
          No leads collected yet. Configure a lead collection action and chat with your agent to start collecting leads.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-surface-hover">
                  <td className="px-4 py-3 text-primary">{lead.name || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.email || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.phone || '-'}</td>
                  <td className="px-4 py-3 text-muted">{new Date(lead.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(lead.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
