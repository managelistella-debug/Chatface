'use client';

import { use } from 'react';
import { AIActionsManager } from '@/components/dashboard/AIActionsManager';

export default function ActionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-2xl font-semibold text-primary">Actions</h1>
      </div>
      <div className="px-8 py-6">
        <AIActionsManager agentId={id} />
      </div>
    </div>
  );
}
