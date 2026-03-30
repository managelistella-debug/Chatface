import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { is_human_takeover } = await request.json();

  const updates: Record<string, unknown> = {
    is_human_takeover: !!is_human_takeover,
    updated_at: new Date().toISOString(),
  };

  if (is_human_takeover) {
    updates.human_takeover_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return errorResponse(error.message);

  // Record analytics event
  const conv = data;
  await supabaseAdmin.from('analytics_events').insert({
    agent_id: conv.agent_id,
    event_type: 'human_takeover',
    event_data: { conversation_id: id, is_human_takeover },
  });

  return successResponse(data);
}
