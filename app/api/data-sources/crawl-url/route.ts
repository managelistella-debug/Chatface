import { NextRequest, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { discoverUrls } from '@/lib/rag/extractors/sitemap';
import { fetchPage } from '@/lib/rag/extractors/url-internal';
import { getEmbeddings } from '@/lib/llm/embeddings';
import { v4 as uuidv4 } from 'uuid';

// 300s on Pro, capped at 60s on Hobby — either way we loop through as many
// batches as the time window allows and save state for the daily cron to finish.
export const maxDuration = 300;

const BATCH_SIZE = 5;
const CHAR_LIMIT = 2_000_000; // 2M characters

export async function POST(request: NextRequest) {
  try {
    const { agent_id, url } = await request.json();

    if (!agent_id || !url) {
      return errorResponse('agent_id and url are required', 400);
    }

    const dataSourceId = uuidv4();
    const urlObj = new URL(url);
    const name = `${urlObj.hostname}${urlObj.pathname === '/' ? '' : urlObj.pathname}`;

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
        char_limit: CHAR_LIMIT,
      })
      .select()
      .single();

    if (error) return errorResponse(error.message);

    // after() keeps the function alive after response is sent.
    // On Pro (300s) this can crawl 100-200 pages in one go.
    // On Hobby (60s) it crawls ~25 pages; daily cron finishes the rest.
    after(() => runFullCrawl(dataSourceId, url));

    return successResponse({ ...data, message: 'Crawl started — indexing in the background' }, 201);
  } catch (err) {
    return errorResponse((err as Error).message);
  }
}

/** Full crawl loop — runs until queue empty, char limit hit, or time runs out */
async function runFullCrawl(dataSourceId: string, startUrl: string): Promise<void> {
  try {
    // 1. Discover all URLs via sitemap
    const allUrls = await discoverUrls(startUrl);

    await supabaseAdmin
      .from('data_sources')
      .update({ status: 'processing', crawl_queue: allUrls, updated_at: new Date().toISOString() })
      .eq('id', dataSourceId);

    // 2. Process batches until done
    let done = false;
    while (!done) {
      done = await processCrawlBatch(dataSourceId);
    }
  } catch (err) {
    await supabaseAdmin
      .from('data_sources')
      .update({ status: 'failed', error_message: (err as Error).message, updated_at: new Date().toISOString() })
      .eq('id', dataSourceId);
  }
}

/**
 * Process one batch of pages.
 * Returns true when the crawl is complete (queue empty, char limit hit, or finalised).
 * Exported so the daily cron can call it to finish incomplete crawls.
 */
export async function processCrawlBatch(dataSourceId: string): Promise<boolean> {
  const { data: source, error } = await supabaseAdmin
    .from('data_sources')
    .select('*')
    .eq('id', dataSourceId)
    .single();

  if (error || !source) return true;

  const queue: string[] = (source.crawl_queue as string[]) ?? [];
  const crawledUrls: string[] = (source.crawled_urls as string[]) ?? [];
  const charLimit: number = (source.char_limit as number) ?? CHAR_LIMIT;
  let crawlChars: number = (source.crawl_chars as number) ?? 0;
  let chunkOffset: number = (source.total_chunks as number) ?? 0;

  if (queue.length === 0 || crawlChars >= charLimit) {
    await finaliseCrawl(dataSourceId, source.agent_id);
    return true;
  }

  const batch = queue.slice(0, BATCH_SIZE);
  const remaining = queue.slice(BATCH_SIZE);

  // Fetch all pages in batch in parallel
  const results = await Promise.all(
    batch.map((pageUrl) => fetchPage(pageUrl).then((r) => ({ pageUrl, ...r })))
  );

  const newChunks: {
    agent_id: string;
    data_source_id: string;
    chunk_index: number;
    content: string;
    token_count: number;
    metadata: object;
  }[] = [];

  for (const { pageUrl, text } of results) {
    if (!text || text.length < 50) continue;
    if (crawlChars + text.length > charLimit) break;

    crawlChars += text.length;
    const path = new URL(pageUrl).pathname.replace(/^\//, '') || 'home';
    const content = `[Page: ${path}]\n${text}`;

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
    await finaliseCrawl(dataSourceId, source.agent_id);
    return true;
  }

  return false;
}

/** Embed all un-embedded chunks and mark source as completed */
async function finaliseCrawl(dataSourceId: string, agentId: string): Promise<void> {
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

  // Embed in batches of 100
  const EMBED_BATCH = 100;
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const embeddings = await getEmbeddings(batch.map((c) => c.content));
    const updates = batch.map((chunk, j) =>
      supabaseAdmin
        .from('document_chunks')
        .update({ embedding: JSON.stringify(embeddings[j]) })
        .eq('id', chunk.id)
    );
    await Promise.all(updates);
  }

  const totalTokens = chunks.reduce((s, c) => s + Math.ceil(c.content.length / 4), 0);

  await supabaseAdmin
    .from('data_sources')
    .update({
      status: 'completed',
      total_tokens: totalTokens,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dataSourceId);

  // Log analytics
  await supabaseAdmin.from('analytics_events').insert({
    agent_id: agentId,
    event_type: 'data_source_completed',
    event_data: { data_source_id: dataSourceId, chunks: chunks.length },
  }).then(() => {}, () => {});
}
