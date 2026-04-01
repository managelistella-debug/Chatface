'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCost, formatTokens } from '@/lib/utils/costs';

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  agent_count: number;
  messages: number;
  prompt_tokens: number;
  completion_tokens: number;
  est_cost: number;
}

const MONTH = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-border rounded-xl px-5 py-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-xl font-semibold text-primary">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((j) => { setRows(j.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalMessages = rows.reduce((s, r) => s + r.messages, 0);
  const totalTokens = rows.reduce((s, r) => s + r.prompt_tokens + r.completion_tokens, 0);
  const totalCost = rows.reduce((s, r) => s + r.est_cost, 0);
  const totalAgents = rows.reduce((s, r) => s + r.agent_count, 0);

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">Usage Overview</h1>
        <p className="text-sm text-muted mt-1">{MONTH} — all accounts</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Users" value={loading ? '…' : String(rows.length)} />
        <StatCard label="Agents" value={loading ? '…' : String(totalAgents)} />
        <StatCard label="Messages this month" value={loading ? '…' : totalMessages.toLocaleString()} />
        <StatCard label="Est. API cost" value={loading ? '…' : formatCost(totalCost)} />
      </div>

      {/* Users table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted text-xs uppercase tracking-wide">User</th>
              <th className="px-4 py-3 text-center font-medium text-muted text-xs uppercase tracking-wide">Agents</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">Messages</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">Tokens</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">Est. Cost</th>
              <th className="px-4 py-3 text-right font-medium text-muted text-xs uppercase tracking-wide">Joined</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">No users yet.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-primary">{row.email}</td>
                  <td className="px-4 py-3 text-center text-muted">{row.agent_count}</td>
                  <td className="px-4 py-3 text-right text-muted">{row.messages.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted">
                    {formatTokens(row.prompt_tokens + row.completion_tokens)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-primary">
                    {formatCost(row.est_cost)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${row.id}`}
                      className="text-xs text-primary/60 hover:text-primary transition-colors font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
