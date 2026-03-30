import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  if (!agentId) return errorResponse('agent_id is required', 400);

  const startDate = request.nextUrl.searchParams.get('start_date');
  const endDate = request.nextUrl.searchParams.get('end_date');

  let query = supabaseAdmin
    .from('leads')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error } = await query;
  if (error) return errorResponse(error.message);
  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { agent_id, conversation_id, name, email, phone, custom_fields } = body;
  if (!agent_id) return errorResponse('agent_id is required', 400);

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({ agent_id, conversation_id, name, email, phone, custom_fields: custom_fields || {} })
    .select()
    .single();

  if (error) return errorResponse(error.message);

  // Record analytics event
  await supabaseAdmin.from('analytics_events').insert({
    agent_id,
    event_type: 'lead_collected',
    event_data: { lead_id: data.id, email, conversation_id },
  });

  return successResponse(data, 201);
}
