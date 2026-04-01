import * as cheerio from 'cheerio';

const FETCH_TIMEOUT_MS = 7_000;

/** Fetch a single page and return its clean text content */
export async function fetchPage(url: string): Promise<{ text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ChatFace Bot/1.0' },
      signal: controller.signal,
    });

    if (!res.ok) return { text: '' };

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return { text: '' };

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

    return { text };
  } catch {
    return { text: '' };
  } finally {
    clearTimeout(timer);
  }
}
