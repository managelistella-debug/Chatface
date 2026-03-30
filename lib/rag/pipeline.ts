import { supabaseAdmin } from '@/lib/supabase/server';
import { chunkText } from './chunking';
import { getEmbeddings } from '@/lib/llm/embeddings';
import { extractPdf } from './extractors/pdf';
import { extractDocx } from './extractors/docx';
import { extractTxt } from './extractors/txt';
import { extractUrl } from './extractors/url';
import { logError, log } from '@/lib/utils/logger';

export async function processDataSource(dataSourceId: string): Promise<void> {
  const ctx = 'pipeline';

  try {
    // 1. Get data source info
    const { data: source, error: fetchError } = await supabaseAdmin
      .from('data_sources')
      .select('*')
      .eq('id', dataSourceId)
      .single();

    if (fetchError || !source) throw new Error('Data source not found');

    // Update status to processing
    await supabaseAdmin
      .from('data_sources')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', dataSourceId);

    log(ctx, `Processing data source: ${source.name} (${source.type})`);

    // 2. Extract text
    let text: string;

    if (source.type === 'url') {
      text = await extractUrl(source.url!);
    } else if (source.type === 'text') {
      // Text is stored inline — we need to get it from the first chunk or a temp field
      // For text type, content was stored directly
      const { data: existingChunks } = await supabaseAdmin
        .from('document_chunks')
        .select('content')
        .eq('data_source_id', dataSourceId)
        .order('chunk_index');

      if (existingChunks && existingChunks.length > 0) {
        text = existingChunks.map(c => c.content).join('');
      } else {
        throw new Error('No content found for text data source');
      }
    } else {
      // File-based: download from storage
      const { data: fileData, error: dlError } = await supabaseAdmin.storage
        .from('agent-files')
        .download(source.file_path!);

      if (dlError || !fileData) throw new Error('Failed to download file');

      const buffer = Buffer.from(await fileData.arrayBuffer());

      switch (source.type) {
        case 'pdf':
          text = await extractPdf(buffer);
          break;
        case 'docx':
          text = await extractDocx(buffer);
          break;
        case 'txt':
          text = await extractTxt(buffer);
          break;
        default:
          throw new Error(`Unsupported type: ${source.type}`);
      }
    }

    if (!text.trim()) throw new Error('Extracted text is empty');

    log(ctx, `Extracted ${text.length} characters`);

    // 3. Chunk
    const chunks = chunkText(text);
    log(ctx, `Created ${chunks.length} chunks`);

    // 4. Generate embeddings
    const chunkContents = chunks.map((c) => c.content);
    const embeddings = await getEmbeddings(chunkContents);
    log(ctx, `Generated ${embeddings.length} embeddings`);

    // 5. Delete old chunks for this data source (in case of reprocessing)
    await supabaseAdmin
      .from('document_chunks')
      .delete()
      .eq('data_source_id', dataSourceId);

    // 6. Insert chunks with embeddings
    const chunkRows = chunks.map((chunk, i) => ({
      agent_id: source.agent_id,
      data_source_id: dataSourceId,
      chunk_index: chunk.index,
      content: chunk.content,
      token_count: chunk.tokenCount,
      embedding: JSON.stringify(embeddings[i]),
      metadata: {},
    }));

    // Insert in batches of 50
    for (let i = 0; i < chunkRows.length; i += 50) {
      const batch = chunkRows.slice(i, i + 50);
      const { error: insertError } = await supabaseAdmin
        .from('document_chunks')
        .insert(batch);

      if (insertError) throw insertError;
    }

    // 7. Update data source status
    const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
    await supabaseAdmin
      .from('data_sources')
      .update({
        status: 'completed',
        total_chunks: chunks.length,
        total_tokens: totalTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dataSourceId);

    log(ctx, `Completed: ${chunks.length} chunks, ${totalTokens} tokens`);
  } catch (err) {
    logError(ctx, 'Pipeline failed', err);

    await supabaseAdmin
      .from('data_sources')
      .update({
        status: 'failed',
        error_message: (err as Error).message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dataSourceId);
  }
}
