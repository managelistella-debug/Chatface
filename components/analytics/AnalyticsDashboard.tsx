'use client';

import { useEffect, useState, useCallback } from 'react';
import { ConversationChart } from './charts/ConversationChart';
import { MessageChart } from './charts/MessageChart';
import { SentimentChart } from './charts/SentimentChart';
import { FeedbackChart } from './charts/FeedbackChart';
import { TopTopics } from './TopTopics';
import { RecentActivity } from './RecentActivity';

interface AnalyticsData {
  total_conversations: number;
  total_messages: number;
  avg_messages_per_conversation: number;
  total_leads: number;
  feedback_stats: { thumbs_up: number; thumbs_down: number };
  conversations_by_day: { date: string; count: number }[];
  messages_by_day: { date: string; count: number }[];
  sentiment_distribution: { positive: number; neutral: number; negative: number };
  top_topics: { topic: string; count: number }[];
  avg_confidence_score: number;
  human_takeover_count: number;
  response_quality: number;
}

const PERIODS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

export function AnalyticsDashboard({ agentId }: { agentId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  const fetchAnalytics = useCallback(() => {
    setLoading(true);
    fetch(`/api/analytics?agent_id=${agentId}&period=${period}`)
      .then((r) => r.json())
      .then((j) => { setData(j.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agentId, period]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) return <div className="text-center py-12 text-muted">Loading analytics...</div>;
  if (!data) return <div className="text-center py-12 text-muted">No analytics data available</div>;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              period === p.value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-muted-foreground border border-border hover:bg-surface-hover'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard label="Conversations" value={data.total_conversations} />
        <KPICard label="Messages" value={data.total_messages} />
        <KPICard label="Avg Msgs/Conv" value={data.avg_messages_per_conversation.toFixed(1)} />
        <KPICard label="Leads" value={data.total_leads} />
        <KPICard label="Response Quality" value={`${data.response_quality.toFixed(0)}%`} />
        <KPICard label="Human Takeovers" value={data.human_takeover_count} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="font-semibold text-primary mb-4">Conversations Over Time</h3>
          <ConversationChart data={data.conversations_by_day} />
        </div>
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="font-semibold text-primary mb-4">Messages Over Time</h3>
          <MessageChart data={data.messages_by_day} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="font-semibold text-primary mb-4">Sentiment</h3>
          <SentimentChart data={data.sentiment_distribution} />
        </div>
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="font-semibold text-primary mb-4">Feedback</h3>
          <FeedbackChart data={data.feedback_stats} />
        </div>
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="font-semibold text-primary mb-4">Top Topics</h3>
          <TopTopics data={data.top_topics} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h3 className="font-semibold text-primary mb-4">Recent Activity</h3>
        <RecentActivity agentId={agentId} />
      </div>
    </div>
  );
}

function KPICard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <p className="text-xs font-medium text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-primary mt-1">{value}</p>
    </div>
  );
}
