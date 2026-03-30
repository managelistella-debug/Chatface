import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const allowed = ['auto_sync', 'sync_interval_hours'];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  // When enabling auto_sync, set next_sync_at immediately
  if (body.auto_sync === true) {
    const hours = body.sync_interval_hours ?? 24;
    updates.next_sync_at = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  }
  if (body.auto_sync === false) {
    updates.next_sync_at = null;
  }

  const { data, error } = await supabaseAdmin
    .from('data_sources')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return errorResponse(error.message);
  return successResponse(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Delete chunks first (cascade should handle it, but be explicit)
  await supabaseAdmin.from('document_chunks').delete().eq('data_source_id', id);

  const { error } = await supabaseAdmin
    .from('data_sources')
    .delete()
    .eq('id', id);

  if (error) return errorResponse(error.message);
  return successResponse({ deleted: true });
}
