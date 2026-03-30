import * as cheerio from 'cheerio';

const MAX_PAGES = 50;
const FETCH_TIMEOUT_MS = 10_000;

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
        // Only follow same-domain links, skip anchors and non-HTML resources
        if (
          resolved.hostname === baseUrl.hostname &&
          !resolved.hash &&
          !href.match(/\.(pdf|jpg|jpeg|png|gif|svg|webp|css|js|xml|json|zip|ico)$/i) &&
          resolved.pathname !== baseUrl.pathname
        ) {
          // Normalise: strip query strings and trailing slashes for dedup
          resolved.search = '';
          const normalised = resolved.toString().replace(/\/$/, '');
          links.push(normalised);
        }
      } catch {
        // ignore invalid hrefs
      }
    });

    return { text, links };
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
      // Label the page source so chunks retain context
      const path = new URL(url).pathname.replace(/^\//, '') || 'home';
      allText.push(`[Page: ${path}]\n${text}`);
    }

    // Enqueue unvisited links
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
    // Specific deep page — just fetch that page
    const { text } = await fetchPage(url);
    if (!text) throw new Error(`Failed to fetch content from ${url}`);
    return text;
  }

  // Root or section URL — crawl the full site
  const result = await crawlSite(url);
  if (!result.trim()) throw new Error(`No content found at ${url}`);
  return result;
}
