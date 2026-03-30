import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  if (!agentId) return errorResponse('agent_id is required', 400);

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');

  const { data, error } = await supabaseAdmin
    .from('analytics_events')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return errorResponse(error.message);
  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const { agent_id, event_type, event_data } = await request.json();
  if (!agent_id || !event_type) return errorResponse('agent_id and event_type are required', 400);

  const { data, error } = await supabaseAdmin
    .from('analytics_events')
    .insert({ agent_id, event_type, event_data: event_data || {} })
    .select()
    .single();

  if (error) return errorResponse(error.message);
  return successResponse(data, 201);
}
