import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: agent, error } = await supabaseAdmin
    .from('agents')
    .select('id, name, widget_config')
    .eq('id', id)
    .single();

  if (error || !agent) {
    return new Response(JSON.stringify({ error: 'Agent not found' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ data: agent }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
