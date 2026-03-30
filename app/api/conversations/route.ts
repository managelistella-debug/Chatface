import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  if (!agentId) return errorResponse('agent_id is required', 400);

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('agent_id', agentId)
    .order('updated_at', { ascending: false });

  if (error) return errorResponse(error.message);
  if (!data || data.length === 0) return successResponse([]);

  // Fetch first assistant reply for each conversation (for list preview)
  const ids = data.map((c) => c.id);
  const { data: assistantMsgs } = await supabaseAdmin
    .from('messages')
    .select('conversation_id, content, created_at')
    .in('conversation_id', ids)
    .eq('role', 'assistant')
    .order('created_at', { ascending: true });

  // Fetch message counts per conversation
  const { data: msgCounts } = await supabaseAdmin
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', ids);

  // Map: first assistant message per conversation
  const firstAssistant: Record<string, string> = {};
  if (assistantMsgs) {
    for (const msg of assistantMsgs) {
      if (!firstAssistant[msg.conversation_id]) {
        firstAssistant[msg.conversation_id] = msg.content;
      }
    }
  }

  // Map: message count per conversation
  const countMap: Record<string, number> = {};
  if (msgCounts) {
    for (const msg of msgCounts) {
      countMap[msg.conversation_id] = (countMap[msg.conversation_id] || 0) + 1;
    }
  }

  const enriched = data.map((c) => ({
    ...c,
    ai_preview: firstAssistant[c.id] || null,
    message_count: countMap[c.id] || 0,
  }));

  return successResponse(enriched);
}

export async function POST(request: NextRequest) {
  const { agent_id, title } = await request.json();
  if (!agent_id) return errorResponse('agent_id is required', 400);

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .insert({ agent_id, title: title || 'New Conversation' })
    .select()
    .single();

  if (error) return errorResponse(error.message);
  return successResponse(data, 201);
}
