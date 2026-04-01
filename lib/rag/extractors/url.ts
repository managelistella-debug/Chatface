import * as cheerio from 'cheerio';

const MAX_PAGES = 25;
const FETCH_TIMEOUT_MS = 7_000;
const PARALLEL_BATCH = 5; // fetch this many pages at once

async function fetchPage(url: string): Promise<{ text: string; links: string[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ChatFace Bot/1.0' },
      signal: controller.signal,
    });

    if (!res.ok) return { text: '', links: [] };

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return { text: '', links: [] };

    const html = await res.text();
    const $ = cheerio.load(html);

    $('script, style, nav, footer, header, aside, iframe, noscript, [role="navigation"]').remove();
    $('[class*="nav"], [class*="menu"], [class*="sidebar"], [id*="nav"], [id*="menu"]').remove();

    const mainContent = $('main, article, [role="main"], .content, #content, .main, #main').text();
    const bodyText = mainContent.trim() ? mainContent : $('body').text();

    const text = bodyText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    const baseUrl = new URL(url);
    const links: string[] = [];

    $('a[href]').each((_i, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      try {
        const resolved = new URL(href, url);
        if (
          resolved.hostname === baseUrl.hostname &&
          !resolved.hash &&
          !href.match(/\.(pdf|jpg|jpeg|png|gif|svg|webp|css|js|xml|json|zip|ico)$/i) &&
          resolved.pathname !== baseUrl.pathname
        ) {
          resolved.search = '';
          links.push(resolved.toString().replace(/\/$/, ''));
        }
      } catch {
        // ignore invalid hrefs
      }
    });

    return { text, links };
  } catch (err) {
    // Silently skip pages that time out or fail
    const isAbort = (err as Error).name === 'AbortError' || (err as Error).name === 'TimeoutError';
    if (!isAbort) console.warn(`[url-extractor] skipping ${url}:`, (err as Error).message);
    return { text: '', links: [] };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Crawls a website using parallel batches starting from startUrl.
 * Fetches PARALLEL_BATCH pages at a time, up to MAX_PAGES total.
 */
async function crawlSite(startUrl: string): Promise<string> {
  const visited = new Set<string>();
  const queue: string[] = [startUrl.replace(/\/$/, '')];
  const allText: string[] = [];

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    // Pull next batch of unvisited URLs
    const batch: string[] = [];
    while (queue.length > 0 && batch.length < PARALLEL_BATCH && visited.size + batch.length < MAX_PAGES) {
      const url = queue.shift()!;
      if (!visited.has(url)) {
        batch.push(url);
        visited.add(url);
      }
    }

    if (batch.length === 0) break;

    // Fetch all pages in the batch in parallel
    const results = await Promise.all(batch.map((url) => fetchPage(url).then((r) => ({ url, ...r }))));

    for (const { url, text, links } of results) {
      if (text.length > 50) {
        const path = new URL(url).pathname.replace(/^\//, '') || 'home';
        allText.push(`[Page: ${path}]\n${text}`);
      }
      for (const link of links) {
        if (!visited.has(link) && !queue.includes(link)) {
          queue.push(link);
        }
      }
    }
  }

  return allText.join('\n\n---\n\n');
}

/**
 * Main entry point.
 * - Root/section URLs → crawl the full site (parallel batches, up to 25 pages)
 * - Deep single-page URLs (3+ path segments) → fetch just that page
 */
export async function extractUrl(url: string): Promise<string> {
  const parsed = new URL(url);

  // Only treat as a single page if it's a deeply nested URL (3+ segments e.g. /blog/2024/post)
  // /pricing, /about, /services are still section roots — crawl from there
  const isSinglePage =
    parsed.pathname.length > 1 &&
    !parsed.pathname.endsWith('/') &&
    parsed.pathname.split('/').filter(Boolean).length >= 3;

  if (isSinglePage) {
    const { text } = await fetchPage(url);
    if (!text) throw new Error(`Failed to fetch content from ${url}`);
    return text;
  }

  // Crawl starting from this URL
  const result = await crawlSite(url);
  if (!result.trim()) throw new Error(`No content found at ${url}. The site may block bots or require JavaScript to render.`);
  return result;
}
