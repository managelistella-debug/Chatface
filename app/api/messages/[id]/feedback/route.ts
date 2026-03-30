import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { feedback, feedback_text } = await request.json();

  if (!feedback || !['thumbs_up', 'thumbs_down'].includes(feedback)) {
    return errorResponse('feedback must be thumbs_up or thumbs_down', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .update({ feedback, feedback_text: feedback_text || null })
    .eq('id', id)
    .select('*, conversation:conversations(agent_id)')
    .single();

  if (error) return errorResponse(error.message);

  // Record analytics event
  const agentId = (data as Record<string, unknown> & { conversation?: { agent_id?: string } })?.conversation?.agent_id;
  if (agentId) {
    await supabaseAdmin.from('analytics_events').insert({
      agent_id: agentId,
      event_type: 'feedback_given',
      event_data: { message_id: id, feedback },
    });
  }

  return successResponse(data);
}
