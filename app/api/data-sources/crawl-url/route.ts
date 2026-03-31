import { NextRequest, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { processDataSource } from '@/lib/rag/pipeline';
import { v4 as uuidv4 } from 'uuid';

// Give Vercel up to 60s to finish crawling + embedding in the background
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { agent_id, url } = await request.json();

    if (!agent_id || !url) {
      return errorResponse('agent_id and url are required', 400);
    }

    const dataSourceId = uuidv4();

    const urlObj = new URL(url);
    const name = `${urlObj.hostname}${urlObj.pathname}`;

    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .insert({
        id: dataSourceId,
        agent_id,
        type: 'url',
        name,
        url,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return errorResponse(error.message);

    // after() keeps the Vercel function alive after the response is sent
    after(async () => {
      await processDataSource(dataSourceId);
    });

    return successResponse(data, 201);
  } catch (err) {
    return errorResponse((err as Error).message);
  }
}
