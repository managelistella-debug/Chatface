import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { UpdateQAPairRequest } from '@/lib/types/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('qa_pairs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return errorResponse(error.message, error.code === 'PGRST116' ? 404 : 500);
  return successResponse(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body: UpdateQAPairRequest = await request.json();

  const updates: Record<string, string> = {};
  if (body.question?.trim()) updates.question = body.question.trim();
  if (body.answer?.trim()) updates.answer = body.answer.trim();

  if (Object.keys(updates).length === 0) {
    return errorResponse('No valid fields to update', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('qa_pairs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return errorResponse(error.message, error.code === 'PGRST116' ? 404 : 500);
  return successResponse(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('qa_pairs')
    .delete()
    .eq('id', id);

  if (error) return errorResponse(error.message);
  return successResponse({ deleted: true });
}
