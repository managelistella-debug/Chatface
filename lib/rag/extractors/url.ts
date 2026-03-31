import * as cheerio from 'cheerio';

const MAX_PAGES = 15;
const FETCH_TIMEOUT_MS = 7_000;

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

    // Remove non-content elements
    $('script, style, nav, footer, header, aside, iframe, noscript, [role="navigation"]').remove();
    $('[class*="nav"], [class*="menu"], [class*="sidebar"], [id*="nav"], [id*="menu"]').remove();

    // Extract meaningful text, preferring main content areas
    const mainContent = $('main, article, [role="main"], .content, #content, .main, #main').text();
    const bodyText = mainContent.trim() ? mainContent : $('body').text();

    const text = bodyText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Extract internal links for crawling
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
          const normalised = resolved.toString().replace(/\/$/, '');
          links.push(normalised);
        }
      } catch {
        // ignore invalid hrefs
      }
    });

    return { text, links };
  } catch (err) {
    // Gracefully skip pages that time out or fail — don't crash the whole crawl
    const isAbort = (err as Error).name === 'AbortError' || (err as Error).name === 'TimeoutError';
    if (!isAbort) console.warn(`[url-extractor] skipping ${url}:`, (err as Error).message);
    return { text: '', links: [] };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Crawls a website starting from the given URL and returns all extracted text.
 * Visits up to MAX_PAGES unique pages on the same domain.
 */
async function crawlSite(startUrl: string): Promise<string> {
  const visited = new Set<string>();
  const queue: string[] = [startUrl.replace(/\/$/, '')];
  const allText: string[] = [];

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    const { text, links } = await fetchPage(url);
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

  return allText.join('\n\n---\n\n');
}

/**
 * Main entry point. If the URL looks like a website root, crawls the full site.
 * Otherwise fetches the single page only.
 */
export async function extractUrl(url: string): Promise<string> {
  const parsed = new URL(url);
  const isSinglePage =
    parsed.pathname.length > 1 &&
    !parsed.pathname.endsWith('/') &&
    parsed.pathname.split('/').filter(Boolean).length >= 2;

  if (isSinglePage) {
    const { text } = await fetchPage(url);
    if (!text) throw new Error(`Failed to fetch content from ${url}`);
    return text;
  }

  const result = await crawlSite(url);
  if (!result.trim()) throw new Error(`No content found at ${url}. The site may block crawlers or require JavaScript.`);
  return result;
}
