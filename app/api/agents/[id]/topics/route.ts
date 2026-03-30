import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TopicItem {
  name: string;
  count: number;
  percentage: number;
  sample_questions: string[];
  overlaps_with: string[];
  suggested_qa: {
    question: string;
    answer: string;
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  // Fetch all conversations for this agent
  const { data: conversations, error: convError } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('agent_id', agentId);

  if (convError) return errorResponse(convError.message);
  if (!conversations || conversations.length === 0) {
    return successResponse({ topics: [], total_messages: 0 });
  }

  const convIds = conversations.map((c) => c.id);

  // Fetch all user messages (cap at 300 for token budget)
  const { data: messages, error: msgError } = await supabaseAdmin
    .from('messages')
    .select('content')
    .in('conversation_id', convIds)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(300);

  if (msgError) return errorResponse(msgError.message);
  if (!messages || messages.length === 0) {
    return successResponse({ topics: [], total_messages: 0 });
  }

  // Deduplicate near-identical messages for cleaner analysis
  const unique = Array.from(new Set(messages.map((m) => m.content.trim().toLowerCase())))
    .slice(0, 200);

  const messageList = unique.map((m, i) => `${i + 1}. ${m}`).join('\n');

  const systemPrompt = `You are an expert at analyzing customer support conversations and identifying patterns.
You will be given a list of user messages sent to a business chatbot.
Your job is to cluster them into meaningful topics, count frequency, detect overlaps, and suggest Q&A pairs.

IMPORTANT: Return ONLY valid JSON, no other text.`;

  const userPrompt = `Analyze these ${unique.length} user messages from a business chatbot and group them into topics.

Messages:
${messageList}

Return JSON in this exact format:
{
  "topics": [
    {
      "name": "Short descriptive topic name (3-6 words)",
      "count": 12,
      "percentage": 35,
      "sample_questions": ["exact message 1", "exact message 2", "exact message 3"],
      "overlaps_with": ["Other Topic Name"],
      "suggested_qa": {
        "question": "A clear, canonical question that represents this topic",
        "answer": "A thorough, helpful answer the agent should give for this topic"
      }
    }
  ]
}

Rules:
- Sort topics from most common (highest count) to least common
- counts should add up to approximately ${unique.length} (messages can belong to multiple topics if they genuinely overlap)
- overlaps_with should list OTHER topic names from your results that share significant intent
- sample_questions should be real messages from the list above (verbatim)
- suggested_qa answer should be a complete, standalone answer (2-4 sentences) — not just "contact us"
- Minimum 2 topics, maximum 12 topics
- Only include topics with at least 2 messages`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw) as { topics: TopicItem[] };

    return successResponse({
      topics: parsed.topics || [],
      total_messages: unique.length,
    });
  } catch (err) {
    return errorResponse(`Topic analysis failed: ${(err as Error).message}`);
  }
}
