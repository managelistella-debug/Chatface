import { supabaseAdmin } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/supabase/server-auth';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { estimateCost } from '@/lib/utils/costs';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  // Verify caller is an admin
  const user = await getSessionUser();
  if (!user || !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) {
    return errorResponse('Forbidden', 403);
  }

  // 1. All auth users
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) return errorResponse(usersError.message);

  // 2. All agents (id, user_id, model)
  const { data: agents } = await supabaseAdmin
    .from('agents')
    .select('id, user_id, model');

  // 3. This month's message_sent events with token data
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { data: events } = await supabaseAdmin
    .from('analytics_events')
    .select('agent_id, event_data')
    .eq('event_type', 'message_sent')
    .gte('created_at', startOfMonth.toISOString());

  // Build agent → user / model lookups
  const agentUserMap = new Map<string, string>();
  const agentModelMap = new Map<string, string>();
  const userAgentCount = new Map<string, number>();

  for (const agent of agents ?? []) {
    if (!agent.user_id) continue;
    agentUserMap.set(agent.id, agent.user_id);
    agentModelMap.set(agent.id, agent.model ?? 'gpt-4o');
    userAgentCount.set(agent.user_id, (userAgentCount.get(agent.user_id) ?? 0) + 1);
  }

  // Aggregate per user
  const stats = new Map<string, {
    messages: number;
    prompt_tokens: number;
    completion_tokens: number;
    est_cost: number;
  }>();

  for (const ev of events ?? []) {
    const userId = agentUserMap.get(ev.agent_id);
    if (!userId) continue;
    const model = agentModelMap.get(ev.agent_id) ?? 'gpt-4o';
    const pt = (ev.event_data?.prompt_tokens as number) ?? 0;
    const ct = (ev.event_data?.completion_tokens as number) ?? 0;
    const curr = stats.get(userId) ?? { messages: 0, prompt_tokens: 0, completion_tokens: 0, est_cost: 0 };
    stats.set(userId, {
      messages: curr.messages + 1,
      prompt_tokens: curr.prompt_tokens + pt,
      completion_tokens: curr.completion_tokens + ct,
      est_cost: curr.est_cost + estimateCost(model, pt, ct),
    });
  }

  // Build result list
  const result = users.map((u) => ({
    id: u.id,
    email: u.email ?? '—',
    created_at: u.created_at,
    agent_count: userAgentCount.get(u.id) ?? 0,
    ...(stats.get(u.id) ?? { messages: 0, prompt_tokens: 0, completion_tokens: 0, est_cost: 0 }),
  }));

  // Sort by highest spend first
  result.sort((a, b) => b.est_cost - a.est_cost);

  return successResponse(result);
}
