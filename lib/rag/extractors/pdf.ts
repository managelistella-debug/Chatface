export async function extractPdf(buffer: Buffer): Promise<string> {
  // Dynamic require to avoid build-time issues with pdf-parse canvas dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = await (Function('return import("pdf-parse")')() as Promise<{ default?: (buf: Buffer) => Promise<{ text: string }>; (buf: Buffer): Promise<{ text: string }> }>);
  const parse = pdfParse.default || pdfParse;
  const result = await (parse as (buf: Buffer) => Promise<{ text: string }>)(buffer);
  return result.text;
}
