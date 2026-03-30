import { NextRequest } from 'next/server';

// Re-use the main chat logic but with CORS headers
import { POST as chatHandler } from '@/app/api/chat/route';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const response = await chatHandler(request);

  // Clone response with CORS headers
  const newHeaders = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
}
