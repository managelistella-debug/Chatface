import { countTokens } from '@/lib/utils/tokens';

interface Chunk {
  content: string;
  tokenCount: number;
  index: number;
}

const CHUNK_SIZE = 800; // tokens
const CHUNK_OVERLAP = 200; // tokens

export function chunkText(text: string): Chunk[] {
  // Split into sentences
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
  const chunks: Chunk[] = [];

  let currentChunk = '';
  let currentTokens = 0;
  let overlapBuffer: string[] = [];

  for (const sentence of sentences) {
    const sentenceTokens = countTokens(sentence);

    if (currentTokens + sentenceTokens > CHUNK_SIZE && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokens,
        index: chunks.length,
      });

      // Start new chunk with overlap
      currentChunk = overlapBuffer.join('');
      currentTokens = countTokens(currentChunk);
      overlapBuffer = [];
    }

    currentChunk += sentence;
    currentTokens += sentenceTokens;

    // Track sentences for overlap
    overlapBuffer.push(sentence);
    let overlapTokens = overlapBuffer.reduce((sum, s) => sum + countTokens(s), 0);
    while (overlapTokens > CHUNK_OVERLAP && overlapBuffer.length > 1) {
      overlapBuffer.shift();
      overlapTokens = overlapBuffer.reduce((sum, s) => sum + countTokens(s), 0);
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      tokenCount: countTokens(currentChunk.trim()),
      index: chunks.length,
    });
  }

  return chunks;
}
