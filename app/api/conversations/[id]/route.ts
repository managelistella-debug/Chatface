import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: conversation, error: convError } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (convError) return errorResponse(convError.message, 404);

  const { data: messages, error: msgError } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (msgError) return errorResponse(msgError.message);

  return successResponse({ ...conversation, messages });
}
