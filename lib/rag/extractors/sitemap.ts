const SITEMAP_TIMEOUT_MS = 8_000;

/** Fetch a URL with a timeout, returns null on failure */
async function safeFetch(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SITEMAP_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ChatFace Bot/1.0' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Parse URLs out of a sitemap XML string */
function parseSitemapXml(xml: string): { urls: string[]; sitemapRefs: string[] } {
  const urls: string[] = [];
  const sitemapRefs: string[] = [];

  // Sitemap index: contains <sitemap><loc>…</loc></sitemap>
  const indexMatches = xml.matchAll(/<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/gi);
  for (const m of indexMatches) {
    const u = m[1].trim();
    if (u) sitemapRefs.push(u);
  }

  // Regular sitemap: <url><loc>…</loc>
  const urlMatches = xml.matchAll(/<url>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/url>/gi);
  for (const m of urlMatches) {
    const u = m[1].trim();
    if (u) urls.push(u);
  }

  return { urls, sitemapRefs };
}

/** Filter and prioritise URLs — important pages first, fluff last */
function prioritiseUrls(urls: string[], baseHostname: string): string[] {
  const sameDomain = urls.filter((u) => {
    try { return new URL(u).hostname === baseHostname; } catch { return false; }
  });

  // Score each URL: lower = more important
  function score(url: string): number {
    const path = new URL(url).pathname.toLowerCase();
    const segments = path.split('/').filter(Boolean).length;
    // Penalise paginated/dated/blog/tag pages
    if (/\/(\d{4})\/(\d{2})\//.test(path)) return 100; // dated blog posts
    if (/\/(tag|category|author|page\/\d)/.test(path)) return 90;
    if (/\/(blog|news|press|events)\//.test(path) && segments > 2) return 80;
    if (segments === 0) return 0; // homepage
    if (segments === 1) return 10; // top-level pages
    if (segments === 2) return 20; // second-level
    return 30 + segments * 5;
  }

  return sameDomain.sort((a, b) => score(a) - score(b));
}

/**
 * Discover all pages on a site by reading its sitemap(s).
 * Falls back to an empty array if no sitemap is found.
 * Returns URLs sorted by importance (homepage, top-level pages first).
 */
export async function discoverUrls(siteUrl: string): Promise<string[]> {
  const base = new URL(siteUrl);
  const origin = base.origin;
  const hostname = base.hostname;

  const candidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap/sitemap.xml`,
    `${origin}/wp-sitemap.xml`,           // WordPress
    `${origin}/page-sitemap.xml`,
  ];

  let allUrls: string[] = [];

  for (const sitemapUrl of candidates) {
    const xml = await safeFetch(sitemapUrl);
    if (!xml || !xml.includes('<') ) continue;

    const { urls, sitemapRefs } = parseSitemapXml(xml);
    allUrls.push(...urls);

    // Fetch child sitemaps (index sitemaps)
    for (const ref of sitemapRefs.slice(0, 10)) { // max 10 child sitemaps
      const childXml = await safeFetch(ref);
      if (childXml) {
        const { urls: childUrls } = parseSitemapXml(childXml);
        allUrls.push(...childUrls);
      }
    }

    if (allUrls.length > 0) break; // found a working sitemap
  }

  // Deduplicate
  allUrls = [...new Set(allUrls.map((u) => u.replace(/\/$/, '')))];

  if (allUrls.length === 0) {
    // No sitemap — seed with the starting URL; the crawler will follow links
    return [siteUrl.replace(/\/$/, '')];
  }

  // Always include the start URL
  const startNormalised = siteUrl.replace(/\/$/, '');
  if (!allUrls.includes(startNormalised)) {
    allUrls.unshift(startNormalised);
  }

  return prioritiseUrls(allUrls, hostname);
}
