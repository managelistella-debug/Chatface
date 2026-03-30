'use client';

import { useEffect, useState } from 'react';
import { AnalyticsEvent } from '@/lib/types/database';
import { Badge } from '@/components/ui/Badge';

const EVENT_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' }> = {
  conversation_started: { label: 'Conversation', variant: 'default' },
  message_sent: { label: 'Message', variant: 'default' },
  lead_collected: { label: 'Lead', variant: 'success' },
  action_triggered: { label: 'Action', variant: 'warning' },
  human_takeover: { label: 'Takeover', variant: 'error' },
  feedback_given: { label: 'Feedback', variant: 'default' },
};

export function RecentActivity({ agentId }: { agentId: string }) {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/analytics/events?agent_id=${agentId}&limit=20`)
      .then((r) => r.json())
      .then((j) => { setEvents(j.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agentId]);

  if (loading) return <p className="text-sm text-muted">Loading...</p>;
  if (!events.length) return <p className="text-sm text-muted text-center py-4">No recent activity</p>;

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {events.map((event) => {
        const config = EVENT_LABELS[event.event_type] || { label: event.event_type, variant: 'default' as const };
        return (
          <div key={event.id} className="flex items-center gap-3 text-sm">
            <Badge variant={config.variant}>{config.label}</Badge>
            <span className="text-muted-foreground flex-1 truncate">
              {describeEvent(event)}
            </span>
            <span className="text-muted text-xs whitespace-nowrap">
              {timeAgo(event.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function describeEvent(event: AnalyticsEvent): string {
  const d = event.event_data as Record<string, unknown>;
  switch (event.event_type) {
    case 'lead_collected': return `Lead collected${d.email ? `: ${d.email}` : ''}`;
    case 'human_takeover': return d.is_human_takeover ? 'Human takeover activated' : 'Human takeover deactivated';
    case 'feedback_given': return `${d.feedback === 'thumbs_up' ? '👍' : '👎'} feedback on message`;
    case 'conversation_started': return 'New conversation started';
    default: return event.event_type.replace(/_/g, ' ');
  }
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
