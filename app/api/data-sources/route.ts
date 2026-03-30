import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  if (!agentId) return errorResponse('agent_id is required', 400);

  const { data, error } = await supabaseAdmin
    .from('data_sources')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (error) return errorResponse(error.message);
  return successResponse(data);
}
