import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getLLMClient } from '@/lib/llm/client';
import { retrieveChunks } from '@/lib/rag/retrieval';
import { findQAMatch } from '@/lib/rag/qa-retrieval';
import { buildPrompt } from '@/lib/rag/prompt';
import { detectActionIntent } from '@/lib/actions/detector';
import { executeAction } from '@/lib/actions/executor';
import { logError } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const { agent_id, message, conversation_id, user_identifier, attachments } = await request.json();

    if (!agent_id || !message) {
      return new Response(JSON.stringify({ error: 'agent_id and message are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Get agent
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Check if conversation is in human takeover mode
    if (conversation_id) {
      const { data: existingConv } = await supabaseAdmin
        .from('conversations')
        .select('is_human_takeover')
        .eq('id', conversation_id)
        .single();

      if (existingConv?.is_human_takeover) {
        return new Response(JSON.stringify({ error: 'This conversation is in human takeover mode.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      const { data: conv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({ agent_id, title, user_identifier: user_identifier || null })
        .select()
        .single();

      if (convError) throw convError;
      convId = conv.id;

      // Record analytics event (fire and forget)
      supabaseAdmin.from('analytics_events').insert({
        agent_id,
        event_type: 'conversation_started',
        event_data: { conversation_id: convId },
      }).then(() => {});

      // Upsert contact if user_identifier provided
      if (user_identifier) {
        supabaseAdmin.rpc('upsert_contact', {
          p_agent_id: agent_id,
          p_user_identifier: user_identifier,
        }).then(() => {});
      }
    }

    // 4. Save user message
    await supabaseAdmin.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content: message,
      sources: [],
      attachments: attachments || [],
    });

    // 5. Check Q&A pairs first (fast, exact/fuzzy match)
    const qaMatch = await findQAMatch(agent_id, message);
    if (qaMatch && qaMatch.confidence >= 0.8) {
      // High-confidence Q&A match — return directly without LLM
      const encoder = new TextEncoder();
      const qaResponse = qaMatch.answer;

      await supabaseAdmin.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: qaResponse,
        sources: [],
      });

      await supabaseAdmin
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: qaResponse })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', conversation_id: convId })}\n\n`));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      });
    }

    // 6. Check for AI Action triggers
    const { data: aiActions } = await supabaseAdmin
      .from('ai_actions')
      .select('*')
      .eq('agent_id', agent_id)
      .eq('is_enabled', true);

    let actionContext = '';
    if (aiActions && aiActions.length > 0) {
      const detectedAction = detectActionIntent(message, aiActions);
      if (detectedAction) {
        const result = await executeAction(
          detectedAction,
          { query: message },
          { agent_id, conversation_id: convId }
        );
        if (result.success) {
          actionContext = `\n\n[Action "${detectedAction.name}" was triggered. Result: ${result.message}]`;
        }

        // Record analytics event (fire and forget)
        supabaseAdmin.from('analytics_events').insert({
          agent_id,
          event_type: 'action_triggered',
          event_data: { action_id: detectedAction.id, action_type: detectedAction.type, success: result.success },
        }).then(() => {});
      }
    }

    // 7. Retrieve relevant chunks (RAG)
    const chunks = await retrieveChunks(agent_id, message);

    const dsIds = [...new Set(chunks.map((c) => c.data_source_id))];
    let dsNameMap = new Map<string, string>();
    if (dsIds.length > 0) {
      const { data: dataSources } = await supabaseAdmin
        .from('data_sources')
        .select('id, name')
        .in('id', dsIds);
      dsNameMap = new Map((dataSources || []).map((ds) => [ds.id, ds.name]));
    }

    const chunksWithNames = chunks.map((c) => ({
      ...c,
      data_source_name: dsNameMap.get(c.data_source_id),
    }));

    // Include Q&A partial matches as additional context
    if (qaMatch && qaMatch.confidence > 0.5) {
      chunksWithNames.unshift({
        id: 'qa-match',
        content: `Q: ${message}\nA: ${qaMatch.answer}`,
        data_source_id: 'qa-pairs',
        similarity: qaMatch.confidence,
        data_source_name: 'Q&A Pairs',
      });
    }

    // 8. Get conversation history
    const { data: historyMessages } = await supabaseAdmin
      .from('messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    // 9. Build prompt
    let systemPrompt = agent.system_prompt;

    // Add action descriptions to system prompt if actions exist
    if (aiActions && aiActions.length > 0) {
      const actionDescs = aiActions.map((a) => `- ${a.name}: ${a.description}`).join('\n');
      systemPrompt += `\n\nYou have the following capabilities:\n${actionDescs}`;
    }

    if (actionContext) {
      systemPrompt += actionContext;
    }

    // Build effective user message — prepend document attachment text as context
    let effectiveMessage = message;
    if (attachments?.length) {
      const docParts = (attachments as { type: string; name: string; content: string }[])
        .filter((a) => a.type === 'document')
        .map((a) => `[Attached file: ${a.name}]\n${a.content}`)
        .join('\n\n');
      if (docParts) {
        effectiveMessage = `${docParts}\n\n---\nUser question: ${message}`;
      }
    }

    const promptMessages = buildPrompt(
      systemPrompt,
      chunksWithNames,
      (historyMessages || []).slice(0, -1),
      effectiveMessage,
      agent.guardrails ?? null
    );

    // 10. Stream response
    const model = getLLMClient(agent.model);

    // Build messages — inject image attachments into the last user message
    type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string | Array<{ type: string; [key: string]: unknown }> };
    const llmMessages: LLMMessage[] = promptMessages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

    const imageAttachments = (attachments as { type: string; name: string; content: string; mime_type: string }[] | undefined)
      ?.filter((a) => a.type === 'image') || [];

    if (imageAttachments.length > 0) {
      // Find last user message and upgrade its content to a multi-part array
      for (let i = llmMessages.length - 1; i >= 0; i--) {
        if (llmMessages[i].role === 'user') {
          const textContent = typeof llmMessages[i].content === 'string' ? llmMessages[i].content : '';
          llmMessages[i].content = [
            { type: 'text', text: textContent },
            ...imageAttachments.map((img) => ({
              type: 'image',
              image: `data:${img.mime_type};base64,${img.content}`,
            })),
          ];
          break;
        }
      }
    }

    const result = streamText({
      model,
      messages: llmMessages as import('ai').ModelMessage[],
      temperature: agent.temperature,
    });

    const sources = chunksWithNames
      .filter((c) => c.id !== 'qa-match')
      .map((c) => ({
        chunk_id: c.id,
        data_source_name: c.data_source_name || 'Unknown',
        content_preview: c.content.substring(0, 100),
        similarity: c.similarity,
      }));

    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const textStream = (await result).textStream;

          for await (const chunk of textStream) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`)
            );
          }

          // Save assistant message
          await supabaseAdmin.from('messages').insert({
            conversation_id: convId,
            role: 'assistant',
            content: fullResponse,
            sources,
          });

          // Update conversation timestamp
          await supabaseAdmin
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', convId);

          // Capture token usage from the LLM response
          const usage = await result.usage;

          // Record message analytics with token data (fire and forget)
          supabaseAdmin.from('analytics_events').insert({
            agent_id,
            event_type: 'message_sent',
            event_data: {
              conversation_id: convId,
              model: agent.model ?? 'gpt-4o',
              prompt_tokens: usage?.promptTokens ?? 0,
              completion_tokens: usage?.completionTokens ?? 0,
              total_tokens: usage?.totalTokens ?? 0,
            },
          }).then(() => {});

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'done', conversation_id: convId })}\n\n`
            )
          );
          controller.close();
        } catch (err) {
          logError('chat', 'Stream error', err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', content: (err as Error).message })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    logError('chat', 'Chat error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
