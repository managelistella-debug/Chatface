import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { CreateAgentRequest } from '@/lib/types/api';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return errorResponse(error.message);
  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const body: CreateAgentRequest = await request.json();

  if (!body.name?.trim()) {
    return errorResponse('Name is required', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('agents')
    .insert({
      name: body.name.trim(),
      system_prompt: body.system_prompt || 'You are a helpful assistant.',
      model: body.model || 'gpt-4o-mini',
      temperature: body.temperature ?? 0.7,
      widget_config: body.widget_config || {},
    })
    .select()
    .single();

  if (error) return errorResponse(error.message);
  return successResponse(data, 201);
}
