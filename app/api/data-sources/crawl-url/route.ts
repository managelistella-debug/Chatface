import { NextRequest, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { discoverUrls } from '@/lib/rag/extractors/sitemap';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { agent_id, url } = await request.json();

    if (!agent_id || !url) {
      return errorResponse('agent_id and url are required', 400);
    }

    const dataSourceId = uuidv4();
    const urlObj = new URL(url);
    const name = `${urlObj.hostname}${urlObj.pathname === '/' ? '' : urlObj.pathname}`;

    // Create the record immediately so the UI shows it
    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .insert({
        id: dataSourceId,
        agent_id,
        type: 'url',
        name,
        url,
        status: 'pending',
        crawl_queue: [],
        crawled_urls: [],
        crawl_chars: 0,
        pages_crawled: 0,
      })
      .select()
      .single();

    if (error) return errorResponse(error.message);

    // Discover URLs via sitemap in background, then kick off first batch
    after(async () => {
      try {
        const allUrls = await discoverUrls(url);

        await supabaseAdmin
          .from('data_sources')
          .update({
            status: 'processing',
            crawl_queue: allUrls,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dataSourceId);

        // Immediately process the first batch without waiting for cron
        await processCrawlBatch(dataSourceId);
      } catch (err) {
        await supabaseAdmin
          .from('data_sources')
          .update({
            status: 'failed',
            error_message: (err as Error).message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dataSourceId);
      }
    });

    return successResponse({ ...data, message: 'Crawl started — indexing in the background' }, 201);
  } catch (err) {
    return errorResponse((err as Error).message);
  }
}

// Exported so the cron job can call it too
export async function processCrawlBatch(dataSourceId: string): Promise<void> {
  const { data: source, error } = await supabaseAdmin
    .from('data_sources')
    .select('*')
    .eq('id', dataSourceId)
    .single();

  if (error || !source) return;

  const queue: string[] = (source.crawl_queue as string[]) || [];
  const crawledUrls: string[] = (source.crawled_urls as string[]) || [];
  const charLimit: number = (source.char_limit as number) || 2_000_000;
  let crawlChars: number = (source.crawl_chars as number) || 0;

  if (queue.length === 0 || crawlChars >= charLimit) {
    // Nothing left — finalise
    await finalise(dataSourceId, source.agent_id);
    return;
  }

  const BATCH_SIZE = 5;
  const batch = queue.slice(0, BATCH_SIZE);
  const remaining = queue.slice(BATCH_SIZE);

  const { fetchPage } = await import('@/lib/rag/extractors/url-internal');

  const results = await Promise.all(
    batch.map((pageUrl) => fetchPage(pageUrl).then((r) => ({ pageUrl, ...r })))
  );

  const newChunks: { agent_id: string; data_source_id: string; chunk_index: number; content: string; token_count: number; metadata: object }[] = [];
  let chunkOffset = (source.total_chunks as number) || 0;

  for (const { pageUrl, text } of results) {
    if (!text || text.length < 50) continue;
    if (crawlChars + text.length > charLimit) break;

    crawlChars += text.length;
    const path = new URL(pageUrl).pathname.replace(/^\//, '') || 'home';
    const content = `[Page: ${path}]\n${text}`;

    // Simple chunking inline (avoid importing full chunking for perf)
    const CHUNK_SIZE = 1500;
    for (let i = 0; i < content.length; i += CHUNK_SIZE) {
      const chunk = content.slice(i, i + CHUNK_SIZE);
      newChunks.push({
        agent_id: source.agent_id,
        data_source_id: dataSourceId,
        chunk_index: chunkOffset++,
        content: chunk,
        token_count: Math.ceil(chunk.length / 4),
        metadata: { source_url: pageUrl },
      });
    }
  }

  if (newChunks.length > 0) {
    await supabaseAdmin.from('document_chunks').insert(newChunks);
  }

  const newCrawledUrls = [...crawledUrls, ...batch];
  const isDone = remaining.length === 0 || crawlChars >= charLimit;

  await supabaseAdmin
    .from('data_sources')
    .update({
      crawl_queue: remaining,
      crawled_urls: newCrawledUrls,
      crawl_chars: crawlChars,
      pages_crawled: newCrawledUrls.length,
      total_chunks: chunkOffset,
      status: isDone ? 'embedding' : 'processing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', dataSourceId);

  if (isDone) {
    await finalise(dataSourceId, source.agent_id);
  }
}

async function finalise(dataSourceId: string, agentId: string): Promise<void> {
  // Get all un-embedded chunks for this source
  const { data: chunks } = await supabaseAdmin
    .from('document_chunks')
    .select('id, content')
    .eq('data_source_id', dataSourceId)
    .is('embedding', null)
    .order('chunk_index');

  if (!chunks || chunks.length === 0) {
    await supabaseAdmin
      .from('data_sources')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', dataSourceId);
    return;
  }

  const { getEmbeddings } = await import('@/lib/llm/embeddings');

  // Embed in batches of 100
  const EMBED_BATCH = 100;
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const embeddings = await getEmbeddings(batch.map((c) => c.content));
    for (let j = 0; j < batch.length; j++) {
      await supabaseAdmin
        .from('document_chunks')
        .update({ embedding: JSON.stringify(embeddings[j]) })
        .eq('id', batch[j].id);
    }
  }

  const totalTokens = chunks.reduce((s, c) => s + Math.ceil(c.content.length / 4), 0);

  await supabaseAdmin
    .from('data_sources')
    .update({
      status: 'completed',
      total_chunks: chunks.length,
      total_tokens: totalTokens,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dataSourceId);
}
