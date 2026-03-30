import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { CreateQAPairRequest } from '@/lib/types/api';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  if (!agentId) return errorResponse('agent_id is required', 400);

  const { data, error } = await supabaseAdmin
    .from('qa_pairs')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (error) return errorResponse(error.message);
  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const body: CreateQAPairRequest = await request.json();

  if (!body.agent_id?.trim()) {
    return errorResponse('agent_id is required', 400);
  }
  if (!body.question?.trim()) {
    return errorResponse('question is required', 400);
  }
  if (!body.answer?.trim()) {
    return errorResponse('answer is required', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('qa_pairs')
    .insert({
      agent_id: body.agent_id.trim(),
      question: body.question.trim(),
      answer: body.answer.trim(),
    })
    .select()
    .single();

  if (error) return errorResponse(error.message);
  return successResponse(data, 201);
}
