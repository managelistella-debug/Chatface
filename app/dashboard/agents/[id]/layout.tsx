'use client';

import { useEffect, useState, use } from 'react';
import { Agent } from '@/lib/types/database';
import { AgentSidebar } from '@/components/dashboard/AgentSidebar';

export default function AgentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [agentName, setAgentName] = useState<string>('');

  useEffect(() => {
    // Load from sessionStorage instantly, then confirm with API
    const cached = sessionStorage.getItem(`agent-name-${id}`);
    if (cached) setAgentName(cached);

    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((r: { data: Agent | null }) => {
        const name = r.data?.name || '';
        if (name) {
          setAgentName(name);
          sessionStorage.setItem(`agent-name-${id}`, name);
        }
      })
      .catch(() => {});
  }, [id]);

  return (
    <div className="flex h-full">
      <AgentSidebar agentId={id} agentName={agentName || '…'} />
      <div className="flex-1 overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}
