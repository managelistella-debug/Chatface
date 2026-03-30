import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { processDataSource } from '@/lib/rag/pipeline';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  // Fetch all data sources for this agent
  const { data: sources, error } = await supabaseAdmin
    .from('data_sources')
    .select('id, status')
    .eq('agent_id', agentId);

  if (error) return errorResponse(error.message);
  if (!sources || sources.length === 0) return successResponse({ reprocessed: 0 });

  // Reset all sources to pending
  await supabaseAdmin
    .from('data_sources')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('agent_id', agentId);

  // Fire-and-forget reprocessing for each source
  for (const source of sources) {
    processDataSource(source.id).then(() => {}).catch(() => {});
  }

  // Try to update last_trained_at (column added by migration 003 — ignore if missing)
  supabaseAdmin
    .from('agents')
    .update({ last_trained_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', agentId)
    .then(() => {});

  return successResponse({ reprocessed: sources.length });
}
