import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { extractPdf } from '@/lib/rag/extractors/pdf';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return errorResponse('No file provided', 400);

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) return errorResponse('File too large (max 10 MB)', 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type;
    const name = file.name;

    // Image types — return base64 for vision
    if (mime.startsWith('image/')) {
      const base64 = buffer.toString('base64');
      const response = new Response(
        JSON.stringify({ data: { type: 'image', name, mime_type: mime, content: base64 } }),
        { headers: { 'Content-Type': 'application/json', ...CORS } }
      );
      return response;
    }

    // PDF — extract text
    if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
      const text = await extractPdf(buffer);
      const truncated = text.slice(0, 8000); // cap for token budget
      const response = new Response(
        JSON.stringify({ data: { type: 'document', name, mime_type: mime, content: truncated } }),
        { headers: { 'Content-Type': 'application/json', ...CORS } }
      );
      return response;
    }

    // Plain text files
    if (
      mime === 'text/plain' ||
      name.endsWith('.txt') ||
      name.endsWith('.md') ||
      name.endsWith('.csv')
    ) {
      const text = buffer.toString('utf-8').slice(0, 8000);
      const response = new Response(
        JSON.stringify({ data: { type: 'document', name, mime_type: mime, content: text } }),
        { headers: { 'Content-Type': 'application/json', ...CORS } }
      );
      return response;
    }

    return errorResponse('Unsupported file type. Supported: PDF, images (JPG/PNG), TXT', 400);
  } catch (err) {
    return errorResponse((err as Error).message);
  }
}
