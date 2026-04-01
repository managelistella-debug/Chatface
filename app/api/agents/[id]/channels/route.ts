import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('channel_integrations')
    .select('id, channel, page_id, page_name, instagram_username, is_active, created_at')
    .eq('agent_id', id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) return errorResponse(error.message);
  return successResponse(data ?? []);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const integrationId = request.nextUrl.searchParams.get('integration_id');
  if (!integrationId) return errorResponse('integration_id required', 400);

  const { error } = await supabaseAdmin
    .from('channel_integrations')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', integrationId)
    .eq('agent_id', id); // ensure ownership

  if (error) return errorResponse(error.message);
  return successResponse({ disconnected: true });
}
