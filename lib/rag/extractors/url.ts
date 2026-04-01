// This extractor is used by the pipeline for re-processing existing URL sources.
// New URL sources go through the sitemap-based queue in /api/data-sources/crawl-url.
export { fetchPage } from './url-internal';
export async function extractUrl(_url: string): Promise<string> {
  throw new Error('extractUrl is deprecated — use the crawl queue via /api/data-sources/crawl-url');
}
