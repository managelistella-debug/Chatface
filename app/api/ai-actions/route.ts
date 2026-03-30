import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  if (!agentId) return errorResponse('agent_id is required', 400);

  const { data, error } = await supabaseAdmin
    .from('ai_actions')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (error) return errorResponse(error.message);
  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { agent_id, type, name, description, config } = body;

  if (!agent_id || !type || !name) {
    return errorResponse('agent_id, type, and name are required', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('ai_actions')
    .insert({ agent_id, type, name, description: description || '', is_enabled: true, config: config || {} })
    .select()
    .single();

  if (error) return errorResponse(error.message);
  return successResponse(data, 201);
}
