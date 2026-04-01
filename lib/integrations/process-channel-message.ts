/**
 * Core AI message processor for channel integrations (Messenger, Instagram, etc).
 * Non-streaming — returns the complete response text.
 */
import { generateText } from 'ai';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getLLMClient } from '@/lib/llm/client';
import { retrieveChunks } from '@/lib/rag/retrieval';
import { findQAMatch } from '@/lib/rag/qa-retrieval';
import { buildPrompt } from '@/lib/rag/prompt';

export async function processChannelMessage(
  agentId: string,
  message: string,
  /** Platform-scoped user ID, e.g. "messenger:1234567890" */
  userIdentifier: string,
  channel: string
): Promise<string> {
  // 1. Load agent
  const { data: agent, error: agentError } = await supabaseAdmin
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    console.error('processChannelMessage: agent not found', agentId);
    return "I'm sorry, I couldn't process your message right now. Please try again later.";
  }

  // 2. Get or reuse conversation for this platform user
  const { data: existingConv } = await supabaseAdmin
    .from('conversations')
    .select('id, is_human_takeover')
    .eq('agent_id', agentId)
    .eq('user_identifier', userIdentifier)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  // If a human has taken over this conversation, stay silent
  if (existingConv?.is_human_takeover) return '';

  let convId: string;
  if (existingConv) {
    convId = existingConv.id;
  } else {
    const { data: newConv, error: convErr } = await supabaseAdmin
      .from('conversations')
      .insert({
        agent_id: agentId,
        title: message.substring(0, 50) + (message.length > 50 ? '…' : ''),
        user_identifier: userIdentifier,
        metadata: { channel },
      })
      .select()
      .single();
    if (convErr || !newConv) {
      console.error('processChannelMessage: failed to create conversation', convErr);
      return "I'm sorry, something went wrong. Please try again.";
    }
    convId = newConv.id;
  }

  // 3. Save incoming user message
  await supabaseAdmin.from('messages').insert({
    conversation_id: convId,
    role: 'user',
    content: message,
    sources: [],
  });

  // 4. Quick Q&A match (no LLM needed)
  const qaMatch = await findQAMatch(agentId, message);
  if (qaMatch && qaMatch.confidence >= 0.8) {
    await supabaseAdmin.from('messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: qaMatch.answer,
      sources: [],
    });
    await supabaseAdmin.from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', convId);
    return qaMatch.answer;
  }

  // 5. RAG retrieval
  const chunks = await retrieveChunks(agentId, message);

  // 6. Conversation history
  const { data: history } = await supabaseAdmin
    .from('messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true });

  // 7. Build prompt (exclude the message we just saved — it's the last one)
  const promptMessages = buildPrompt(
    agent.system_prompt,
    chunks,
    (history ?? []).slice(0, -1),
    message,
    agent.guardrails ?? null
  );

  // 8. Generate response
  const llmModel = getLLMClient(agent.model);
  type LLMMsg = { role: 'system' | 'user' | 'assistant'; content: string };
  const { text, usage } = await generateText({
    model: llmModel,
    messages: promptMessages.map((m) => ({
      role: m.role as LLMMsg['role'],
      content: m.content,
    })),
    temperature: agent.temperature ?? 0.7,
  });

  // 9. Save assistant response
  await supabaseAdmin.from('messages').insert({
    conversation_id: convId,
    role: 'assistant',
    content: text,
    sources: chunks.map((c) => ({
      chunk_id: c.id,
      data_source_name: 'Source',
      content_preview: c.content.substring(0, 100),
      similarity: c.similarity,
    })),
  });

  await supabaseAdmin.from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', convId);

  // 10. Analytics (fire and forget)
  supabaseAdmin.from('analytics_events').insert({
    agent_id: agentId,
    event_type: 'message_sent',
    event_data: {
      conversation_id: convId,
      channel,
      model: agent.model ?? 'gpt-4o',
      prompt_tokens: usage?.inputTokens ?? 0,
      completion_tokens: usage?.outputTokens ?? 0,
      total_tokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
    },
  }).then(() => {});

  return text;
}
