import { NextRequest, after } from 'next/server';

export const maxDuration = 60;
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';
import { processDataSource } from '@/lib/rag/pipeline';
import { chunkText } from '@/lib/rag/chunking';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { agent_id, name, content } = await request.json();

    if (!agent_id || !name || !content) {
      return errorResponse('agent_id, name, and content are required', 400);
    }

    const dataSourceId = uuidv4();

    // Create data source record
    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .insert({
        id: dataSourceId,
        agent_id,
        type: 'text',
        name,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return errorResponse(error.message);

    // Store raw text as initial chunks (pipeline will re-chunk and embed)
    const chunks = chunkText(content);
    const chunkRows = chunks.map((chunk) => ({
      agent_id,
      data_source_id: dataSourceId,
      chunk_index: chunk.index,
      content: chunk.content,
      token_count: chunk.tokenCount,
      metadata: {},
    }));

    await supabaseAdmin.from('document_chunks').insert(chunkRows);

    after(async () => {
      await processDataSource(dataSourceId);
    });

    return successResponse(data, 201);
  } catch (err) {
    return errorResponse((err as Error).message);
  }
}
