import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  if (!agentId) return errorResponse('agent_id is required', 400);

  const { data, error } = await supabaseAdmin
    .from('help_pages')
    .select('*')
    .eq('agent_id', agentId)
    .single();

  if (error && error.code !== 'PGRST116') return errorResponse(error.message);
  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const { agent_id, slug, config } = await request.json();
  if (!agent_id || !slug) return errorResponse('agent_id and slug are required', 400);

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

  const { data, error } = await supabaseAdmin
    .from('help_pages')
    .insert({
      agent_id,
      slug: cleanSlug,
      is_published: false,
      config: config || { welcome_title: 'How can we help?', welcome_description: '', background_color: '#ffffff', text_color: '#1a1a1a' },
    })
    .select()
    .single();

  if (error) return errorResponse(error.message);
  return successResponse(data, 201);
}
