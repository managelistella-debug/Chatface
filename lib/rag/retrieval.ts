import { supabaseAdmin } from '@/lib/supabase/server';
import { getEmbedding } from '@/lib/llm/embeddings';
import { log } from '@/lib/utils/logger';

interface RetrievedChunk {
  id: string;
  content: string;
  data_source_id: string;
  similarity: number;
  data_source_name?: string;
}

export async function retrieveChunks(
  agentId: string,
  query: string,
  topK: number = 10,
  threshold: number = 0.3
): Promise<RetrievedChunk[]> {
  const embedding = await getEmbedding(query);

  // Use pgvector cosine similarity search via RPC
  const { data, error } = await supabaseAdmin.rpc('match_documents', {
    query_embedding: JSON.stringify(embedding),
    match_agent_id: agentId,
    match_threshold: threshold,
    match_count: topK,
  });

  if (error) {
    log('retrieval', 'RPC match_documents failed, falling back to manual query', error.message);
    // Fallback: fetch all chunks and compute similarity in-memory (not ideal but works)
    return fallbackRetrieval(agentId, embedding, topK, threshold);
  }

  return (data || []).map((row: { id: string; content: string; data_source_id: string; similarity: number }) => ({
    id: row.id,
    content: row.content,
    data_source_id: row.data_source_id,
    similarity: row.similarity,
  }));
}

async function fallbackRetrieval(
  agentId: string,
  queryEmbedding: number[],
  topK: number,
  threshold: number
): Promise<RetrievedChunk[]> {
  const { data: chunks, error } = await supabaseAdmin
    .from('document_chunks')
    .select('id, content, data_source_id, embedding')
    .eq('agent_id', agentId)
    .not('embedding', 'is', null);

  if (error || !chunks) return [];

  // Compute cosine similarity
  const results = chunks
    .map((chunk) => {
      const chunkEmb = typeof chunk.embedding === 'string'
        ? JSON.parse(chunk.embedding)
        : chunk.embedding;

      const similarity = cosineSimilarity(queryEmbedding, chunkEmb);
      return {
        id: chunk.id,
        content: chunk.content,
        data_source_id: chunk.data_source_id,
        similarity,
      };
    })
    .filter((r) => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
