import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { processDataSource } from '@/lib/rag/pipeline';

// Called by Vercel Cron or external scheduler every hour
// vercel.json: { "crons": [{ "path": "/api/cron/sync-sources", "schedule": "0 * * * *" }] }
export async function GET(request: NextRequest) {
  // Simple token auth to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse('Unauthorized', 401);
  }

  const now = new Date().toISOString();

  // Find URL data sources with auto_sync enabled and past their next_sync_at
  const { data: sources, error } = await supabaseAdmin
    .from('data_sources')
    .select('id, name, agent_id, type, sync_interval_hours')
    .eq('auto_sync', true)
    .eq('type', 'url') // only URL sources can be re-crawled automatically
    .lte('next_sync_at', now)
    .neq('status', 'processing');

  if (error) return errorResponse(error.message);
  if (!sources?.length) return successResponse({ synced: 0, message: 'Nothing to sync' });

  const results: { id: string; name: string; status: string }[] = [];

  for (const source of sources) {
    try {
      // Calculate next sync time
      const hours = source.sync_interval_hours || 24;
      const nextSync = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      // Update timestamps before processing
      await supabaseAdmin
        .from('data_sources')
        .update({
          last_synced_at: now,
          next_sync_at: nextSync,
          status: 'pending',
        })
        .eq('id', source.id);

      // Re-process in background
      processDataSource(source.id).catch(console.error);

      results.push({ id: source.id, name: source.name, status: 'queued' });
    } catch (err) {
      results.push({ id: source.id, name: source.name, status: `error: ${(err as Error).message}` });
    }
  }

  return successResponse({ synced: results.length, results });
}
