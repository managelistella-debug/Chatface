'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { formatCost, formatTokens } from '@/lib/utils/costs';

interface AgentRow {
  id: string;
  name: string;
  model: string;
  is_active: boolean;
  created_at: string;
  messages: number;
  prompt_tokens: number;
  completion_tokens: number;
  est_cost: number;
}

interface UserData {
  user: { id: string; email: string; created_at: string };
  agents: AgentRow[];
}

const MODEL_LABELS: Record<string, string> = {
  'gpt-4o':       'GPT-4o',
  'gpt-4o-mini':  'GPT-4o mini',
  'claude-sonnet':'Claude Sonnet',
  'claude-haiku': 'Claude Haiku',
};

const MONTH = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-border rounded-xl px-5 py-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-xl font-semibold text-primary">{value}</p>
    </div>
  );
}

export default function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((j) => { setData(j.data ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const agents = data?.agents ?? [];
  const totalMessages = agents.reduce((s, a) => s + a.messages, 0);
  const totalTokens = agents.reduce((s, a) => s + a.prompt_tokens + a.completion_tokens, 0);
  const totalCost = agents.reduce((s, a) => s + a.est_cost, 0);

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-muted hover:text-primary transition-colors mb-3 inline-block">
          ← All users
        </Link>
        <h1 className="text-2xl font-semibold text-primary">
          {loading ? '…' : (data?.user.email ?? 'Unknown user')}
        </h1>
        <p className="text-sm text-muted mt-1">{MONTH}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Agents" value={loading ? '…' : String(agents.length)} />
        <StatCard label="Messages this month" value={loading ? '…' : totalMessages.toLocaleString()} />
        <StatCard label="Tokens used" value={loading ? '…' : formatTokens(totalTokens)} />
        <StatCard label="Est. API cost" value={loading ? '…' : formatCost(totalCost)} />
      </div>

      {/* Agents breakdown */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface-hover">
          <h2 className="text-sm font-semibold text-primary">Agents</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">Agent</th>
              <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">Model</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">Messages</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">Input tokens</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">Output tokens</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">Est. Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">Loading…</td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                  This user has no agents yet.
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-primary">{agent.name}</span>
                    {!agent.is_active && (
                      <span className="ml-2 text-[10px] font-medium text-muted bg-surface-hover rounded px-1.5 py-0.5">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {MODEL_LABELS[agent.model] ?? agent.model}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">
                    {agent.messages.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">
                    {formatTokens(agent.prompt_tokens)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">
                    {formatTokens(agent.completion_tokens)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-primary">
                    {formatCost(agent.est_cost)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {agents.length > 0 && (
            <tfoot className="border-t border-border bg-surface-hover/50">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Total</td>
                <td className="px-4 py-3 text-right font-semibold text-primary text-sm">
                  {totalMessages.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-primary text-sm">
                  {formatTokens(agents.reduce((s, a) => s + a.prompt_tokens, 0))}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-primary text-sm">
                  {formatTokens(agents.reduce((s, a) => s + a.completion_tokens, 0))}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-primary text-sm">
                  {formatCost(totalCost)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
