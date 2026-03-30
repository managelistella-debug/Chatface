'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Agent } from '@/lib/types/database';

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/agents')
      .then((res) => res.json())
      .then((res) => {
        setAgents(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleDuplicate(agentId: string, name: string) {
    const res = await fetch(`/api/agents/${agentId}`);
    const { data: agent } = await res.json();
    if (!agent) return;

    const dupRes = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${name} (copy)`,
        system_prompt: agent.system_prompt,
        model: agent.model,
        temperature: agent.temperature,
        widget_config: agent.widget_config,
      }),
    });
    const { data: newAgent } = await dupRes.json();
    if (newAgent) {
      setAgents((prev) => [newAgent, ...prev]);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-8 border-b border-border">
        <h1 className="text-2xl font-semibold text-primary">Agents</h1>
        <Link
          href="/dashboard/agents/new"
          className="inline-flex items-center gap-1.5 px-4 h-9 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New AI agent
        </Link>
      </div>

      {/* Content */}
      <div className="px-5 py-6 md:px-8 md:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-hover flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16h6M21 12c0 4.97-4.03 9-9 9a9.003 9.003 0 01-8.354-5.646L3 12a9 9 0 1118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-primary mb-1">No agents yet</h3>
            <p className="text-sm text-muted mb-6 max-w-sm">Create your first AI agent to start automating conversations.</p>
            <Link
              href="/dashboard/agents/new"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create your first agent
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(23.5rem,1fr))] gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="group rounded-xl border border-border overflow-hidden transition-all hover:border-border-hover max-h-[18.75rem]"
              >
                {/* Thumbnail area */}
                <Link
                  href={`/dashboard/agents/${agent.id}`}
                  className="block h-[200px] bg-gradient-to-br from-surface-hover to-white relative overflow-hidden"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    {agent.profile_picture_url ? (
                      <img src={agent.profile_picture_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-white shadow-sm border border-border flex items-center justify-center">
                        <span className="text-3xl font-bold text-primary/30">{agent.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Bottom info */}
                <div className="flex items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <Link href={`/dashboard/agents/${agent.id}`} className="text-sm font-medium text-primary hover:underline truncate block">
                      {agent.name}
                    </Link>
                    {agent.last_trained_at ? (
                      <p className="text-xs text-muted mt-0.5">
                        Last trained <span className="text-muted-foreground">{timeAgo(agent.last_trained_at)}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted mt-0.5">
                        Created {timeAgo(agent.created_at)}
                      </p>
                    )}
                  </div>

                  {/* Options */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const menu = e.currentTarget.nextElementSibling;
                        menu?.classList.toggle('hidden');
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-primary transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    <div className="hidden absolute right-0 top-9 z-10 w-40 bg-white border border-border rounded-lg shadow-lg py-1">
                      <button
                        onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                        className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-surface-hover"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(agent.id, agent.name)}
                        className="w-full text-left px-3 py-1.5 text-sm text-primary hover:bg-surface-hover"
                      >
                        Duplicate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* New Agent Card */}
            <Link
              href="/dashboard/agents/new"
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border hover:border-border-hover transition-colors min-h-[18.75rem] text-muted hover:text-primary"
            >
              <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-sm font-medium">New AI agent</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(date).toLocaleDateString();
}
