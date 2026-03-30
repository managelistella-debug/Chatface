import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SuggestionItem {
  user_question: string;
  similar_questions: string[];
  count: number;
  suggested_qa: { question: string; answer: string };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  // Get conversations for this agent
  const { data: conversations } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('agent_id', agentId);

  if (!conversations?.length) return successResponse({ suggestions: [], total: 0 });

  const convIds = conversations.map((c) => c.id);

  // Find all assistant messages with thumbs_down feedback
  const { data: badMessages } = await supabaseAdmin
    .from('messages')
    .select('id, conversation_id, content, created_at')
    .in('conversation_id', convIds)
    .eq('role', 'assistant')
    .eq('feedback', 'thumbs_down')
    .order('created_at', { ascending: false })
    .limit(200);

  if (!badMessages?.length) return successResponse({ suggestions: [], total: 0 });

  // For each bad message, find the preceding user question
  const pairs: { question: string; bad_answer: string }[] = [];

  for (const msg of badMessages) {
    const { data: allInConv } = await supabaseAdmin
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', msg.conversation_id)
      .order('created_at', { ascending: true });

    if (!allInConv) continue;
    const idx = allInConv.findIndex(
      (m) => m.role === 'assistant' && m.content === msg.content
    );
    const preceding = allInConv
      .slice(0, idx)
      .reverse()
      .find((m) => m.role === 'user');

    if (preceding) {
      pairs.push({ question: preceding.content, bad_answer: msg.content });
    }
  }

  if (!pairs.length) return successResponse({ suggestions: [], total: 0 });

  const questionList = pairs
    .map((p, i) => `${i + 1}. ${p.question.trim().toLowerCase()}`)
    .join('\n');

  const prompt = `You are analyzing a customer support chatbot's failures. These are questions where the bot gave a bad response (thumbs down from users):

${questionList}

Tasks:
1. Group these questions into clusters of similar intent
2. For each cluster, generate a Q&A pair that would correctly answer those questions
3. Sort clusters from most questions to fewest

Return ONLY valid JSON:
{
  "suggestions": [
    {
      "user_question": "Best representative question from this cluster",
      "similar_questions": ["other question 1", "other question 2"],
      "count": 3,
      "suggested_qa": {
        "question": "A clear canonical question",
        "answer": "A thorough, correct answer (2-4 sentences)"
      }
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw) as { suggestions: SuggestionItem[] };

    return successResponse({
      suggestions: parsed.suggestions || [],
      total: pairs.length,
    });
  } catch (err) {
    return errorResponse(`Suggestions analysis failed: ${(err as Error).message}`);
  }
}
