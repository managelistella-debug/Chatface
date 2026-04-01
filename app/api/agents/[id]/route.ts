import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { UpdateAgentRequest } from '@/lib/types/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return errorResponse(error.message, 404);
  return successResponse(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body: UpdateAgentRequest = await request.json();

  let result = await supabaseAdmin
    .from('agents')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  // If a column doesn't exist (migration 003 not yet run), retry with base-schema columns only
  if (result.error?.message?.includes('column')) {
    const { name, system_prompt, model, temperature, widget_config, guardrails, lead_capture } = body as Record<string, unknown>;
    const safeBody: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) safeBody.name = name;
    if (system_prompt !== undefined) safeBody.system_prompt = system_prompt;
    if (model !== undefined) safeBody.model = model;
    if (temperature !== undefined) safeBody.temperature = temperature;
    if (widget_config !== undefined) safeBody.widget_config = widget_config;
    if (guardrails !== undefined) safeBody.guardrails = guardrails;
    if (lead_capture !== undefined) safeBody.lead_capture = lead_capture;

    result = await supabaseAdmin
      .from('agents')
      .update(safeBody)
      .eq('id', id)
      .select()
      .single();
  }

  if (result.error) return errorResponse(result.error.message);
  return successResponse(result.data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await supabaseAdmin
    .from('agents')
    .delete()
    .eq('id', id);

  if (error) return errorResponse(error.message);
  return successResponse({ deleted: true });
}
