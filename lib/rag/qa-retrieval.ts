import { supabaseAdmin } from '@/lib/supabase/server';

interface QAMatch {
  answer: string;
  confidence: number;
}

/**
 * Search Q&A pairs for exact/fuzzy matches before falling back to vector search.
 * Uses simple text matching: exact match, substring containment, and word overlap.
 * Returns the best match above 0.5 confidence, or null.
 */
export async function findQAMatch(
  agentId: string,
  query: string
): Promise<QAMatch | null> {
  const { data: pairs, error } = await supabaseAdmin
    .from('qa_pairs')
    .select('question, answer')
    .eq('agent_id', agentId);

  if (error || !pairs || pairs.length === 0) return null;

  const normalizedQuery = normalize(query);
  const queryWords = getWords(normalizedQuery);

  let bestMatch: QAMatch | null = null;

  for (const pair of pairs) {
    const normalizedQuestion = normalize(pair.question);
    let confidence = 0;

    // Exact match
    if (normalizedQuery === normalizedQuestion) {
      confidence = 1.0;
    }
    // Query contains the question or question contains the query
    else if (
      normalizedQuery.includes(normalizedQuestion) ||
      normalizedQuestion.includes(normalizedQuery)
    ) {
      confidence = 0.8;
    }
    // Word overlap
    else {
      const questionWords = getWords(normalizedQuestion);
      confidence = wordOverlapScore(queryWords, questionWords);
    }

    if (confidence > 0.5 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { answer: pair.answer, confidence };
    }
  }

  return bestMatch;
}

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

function getWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function wordOverlapScore(queryWords: string[], questionWords: string[]): number {
  if (queryWords.length === 0 || questionWords.length === 0) return 0;

  const questionSet = new Set(questionWords);
  let matchCount = 0;

  for (const word of queryWords) {
    if (questionSet.has(word)) {
      matchCount++;
    }
  }

  // Use the smaller set as denominator for a more generous overlap ratio
  const denominator = Math.min(queryWords.length, questionWords.length);
  const overlap = matchCount / denominator;

  // Only return a meaningful confidence if overlap > 0.6
  if (overlap <= 0.6) return 0;

  // Scale confidence: 0.6 overlap -> ~0.55, 1.0 overlap -> 0.75
  return 0.5 + overlap * 0.25;
}
