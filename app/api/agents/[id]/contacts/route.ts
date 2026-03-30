import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabaseAdmin
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('agent_id', agentId)
    .order('last_seen_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `user_identifier.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) return errorResponse(error.message);

  return successResponse({ contacts: data || [], total: count ?? 0 });
}
