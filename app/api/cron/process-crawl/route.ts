import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { processCrawlBatch } from '@/app/api/data-sources/crawl-url/route';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find all data sources still being crawled
  const { data: sources, error } = await supabaseAdmin
    .from('data_sources')
    .select('id, crawl_queue')
    .in('status', ['processing', 'embedding'])
    .not('crawl_queue', 'eq', '[]');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!sources || sources.length === 0) {
    return NextResponse.json({ message: 'No active crawl jobs' });
  }

  // Process each source (up to 3 in parallel to stay within time limit)
  const toProcess = sources.slice(0, 3);
  await Promise.all(toProcess.map((s) => processCrawlBatch(s.id)));

  return NextResponse.json({
    processed: toProcess.length,
    remaining: sources.length - toProcess.length,
  });
}
