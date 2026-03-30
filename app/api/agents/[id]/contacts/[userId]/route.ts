import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

// GET: conversations for a specific contact
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: agentId, userId } = await params;
  const userIdentifier = decodeURIComponent(userId);

  const { data: conversations, error } = await supabaseAdmin
    .from('conversations')
    .select('id, title, created_at, updated_at, sentiment, is_human_takeover')
    .eq('agent_id', agentId)
    .eq('user_identifier', userIdentifier)
    .order('created_at', { ascending: false });

  if (error) return errorResponse(error.message);
  return successResponse({ conversations: conversations || [] });
}
