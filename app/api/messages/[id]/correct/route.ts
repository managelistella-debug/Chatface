import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: messageId } = await params;
  const { corrected_answer } = await request.json();

  if (!corrected_answer?.trim()) return errorResponse('corrected_answer is required', 400);

  // Get the assistant message
  const { data: msg, error: msgError } = await supabaseAdmin
    .from('messages')
    .select('id, conversation_id, role, created_at')
    .eq('id', messageId)
    .single();

  if (msgError || !msg) return errorResponse('Message not found', 404);
  if (msg.role !== 'assistant') return errorResponse('Can only correct assistant messages', 400);

  // Get all messages in the conversation ordered by time
  const { data: allMessages } = await supabaseAdmin
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', msg.conversation_id)
    .order('created_at', { ascending: true });

  if (!allMessages) return errorResponse('Could not load conversation');

  // Find the user message immediately before this assistant message
  const idx = allMessages.findIndex((m) => m.id === messageId);
  const precedingUser = allMessages
    .slice(0, idx)
    .reverse()
    .find((m) => m.role === 'user');

  if (!precedingUser) return errorResponse('No user message found before this response');

  // Get agent_id from conversation
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('agent_id')
    .eq('id', msg.conversation_id)
    .single();

  if (!conv) return errorResponse('Conversation not found', 404);

  // Create Q&A pair
  const { data: qa, error: qaError } = await supabaseAdmin
    .from('qa_pairs')
    .insert({
      agent_id: conv.agent_id,
      question: precedingUser.content.trim(),
      answer: corrected_answer.trim(),
    })
    .select()
    .single();

  if (qaError) return errorResponse(qaError.message);

  // Mark message as corrected
  await supabaseAdmin
    .from('messages')
    .update({ is_corrected: true })
    .eq('id', messageId);

  return successResponse({ qa_pair: qa }, 201);
}
