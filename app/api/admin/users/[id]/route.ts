import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/supabase/server-auth';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { estimateCost } from '@/lib/utils/costs';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;

  // Verify caller is an admin
  const user = await getSessionUser();
  if (!user || !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) {
    return errorResponse('Forbidden', 403);
  }

  // 1. Fetch auth user for display
  const { data: { user: targetUser }, error: userError } =
    await supabaseAdmin.auth.admin.getUserById(userId);
  if (userError || !targetUser) return errorResponse('User not found', 404);

  // 2. All agents for this user
  const { data: agents } = await supabaseAdmin
    .from('agents')
    .select('id, name, model, created_at, is_active')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!agents || agents.length === 0) {
    return successResponse({
      user: { id: targetUser.id, email: targetUser.email, created_at: targetUser.created_at },
      agents: [],
    });
  }

  // 3. This month's message events for these agents
  const agentIds = agents.map((a) => a.id);
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { data: events } = await supabaseAdmin
    .from('analytics_events')
    .select('agent_id, event_data')
    .eq('event_type', 'message_sent')
    .in('agent_id', agentIds)
    .gte('created_at', startOfMonth.toISOString());

  // Aggregate per agent
  const agentStats = new Map<string, {
    messages: number;
    prompt_tokens: number;
    completion_tokens: number;
    est_cost: number;
  }>();

  const agentModelMap = new Map(agents.map((a) => [a.id, a.model ?? 'gpt-4o']));

  for (const ev of events ?? []) {
    const model = agentModelMap.get(ev.agent_id) ?? 'gpt-4o';
    const pt = (ev.event_data?.prompt_tokens as number) ?? 0;
    const ct = (ev.event_data?.completion_tokens as number) ?? 0;
    const curr = agentStats.get(ev.agent_id) ?? { messages: 0, prompt_tokens: 0, completion_tokens: 0, est_cost: 0 };
    agentStats.set(ev.agent_id, {
      messages: curr.messages + 1,
      prompt_tokens: curr.prompt_tokens + pt,
      completion_tokens: curr.completion_tokens + ct,
      est_cost: curr.est_cost + estimateCost(model, pt, ct),
    });
  }

  const agentsWithStats = agents.map((a) => ({
    ...a,
    ...(agentStats.get(a.id) ?? { messages: 0, prompt_tokens: 0, completion_tokens: 0, est_cost: 0 }),
  }));

  // Sort by highest spend first
  agentsWithStats.sort((a, b) => b.est_cost - a.est_cost);

  return successResponse({
    user: { id: targetUser.id, email: targetUser.email, created_at: targetUser.created_at },
    agents: agentsWithStats,
  });
}
