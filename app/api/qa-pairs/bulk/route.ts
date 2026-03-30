import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

interface BulkQAPair {
  question: string;
  answer: string;
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const agentId = body.agent_id;
  const pairs: BulkQAPair[] = body.pairs;

  if (!agentId?.trim()) {
    return errorResponse('agent_id is required', 400);
  }
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return errorResponse('pairs must be a non-empty array', 400);
  }

  // Validate each pair
  const validPairs = pairs.filter(
    (p) => p.question?.trim() && p.answer?.trim()
  );

  if (validPairs.length === 0) {
    return errorResponse('No valid Q&A pairs found. Each pair needs a question and answer.', 400);
  }

  const rows = validPairs.map((p) => ({
    agent_id: agentId.trim(),
    question: p.question.trim(),
    answer: p.answer.trim(),
  }));

  const { data, error } = await supabaseAdmin
    .from('qa_pairs')
    .insert(rows)
    .select();

  if (error) return errorResponse(error.message);
  return successResponse(data, 201);
}
