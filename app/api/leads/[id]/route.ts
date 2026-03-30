import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin.from('leads').select('*').eq('id', id).single();
  if (error) return errorResponse(error.message, 404);
  return successResponse(data);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from('leads').delete().eq('id', id);
  if (error) return errorResponse(error.message);
  return successResponse({ deleted: true });
}
