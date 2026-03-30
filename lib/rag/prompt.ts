import { countTokens, truncateHistory } from '@/lib/utils/tokens';
import { AgentGuardrails } from '@/lib/types/database';

interface RetrievedChunk {
  content: string;
  data_source_name?: string;
  similarity: number;
}

interface HistoryMessage {
  role: string;
  content: string;
}

const MAX_CONTEXT_TOKENS = 6000;
const MAX_HISTORY_TOKENS = 2000;

const DEFAULT_FALLBACK =
  "I don't have specific details on that in my knowledge base right now. For the most accurate answer, it's best to speak directly with our team — feel free to reach out and we'll get you sorted.";
const DEFAULT_OFF_TOPIC =
  "That's a bit outside what I can help with here — I'm focused on questions about our company and services. Is there something along those lines I can help you with?";

/**
 * Returns guardrails instructions to append to the system prompt.
 * These appear before the context block so the model knows the rules first.
 */
function buildGuardrailsInstructions(
  guardrails: AgentGuardrails | null | undefined
): string {
  if (!guardrails || guardrails.confidentiality === 'off') return '';

  const fallback = guardrails.fallback_message?.trim() || DEFAULT_FALLBACK;
  const lines: string[] = [];

  if (guardrails.confidentiality === 'strict') {
    lines.push(
      `- Answer ONLY using the context provided below. Do not draw on outside knowledge or training data beyond what is explicitly stated in the context.`
    );
    lines.push(
      `- If the answer cannot be found in the context, respond with exactly: "${fallback}"`
    );
    lines.push(`- Never guess, speculate, or fabricate information.`);
  } else if (guardrails.confidentiality === 'moderate') {
    lines.push(
      `- Prefer to answer using the provided context. Supplement with general knowledge only when the context is clearly insufficient.`
    );
    lines.push(
      `- If you genuinely cannot provide a helpful answer, respond with: "${fallback}"`
    );
  }

  if (guardrails.restrict_topics) {
    const offTopic = guardrails.off_topic_message?.trim() || DEFAULT_OFF_TOPIC;
    lines.push(
      `- Only answer questions that are relevant to the company and its products/services. For unrelated questions, respond with: "${offTopic}"`
    );
  }

  if (lines.length === 0) return '';

  return '\n\nIMPORTANT — follow these rules strictly:\n' + lines.join('\n');
}

/**
 * Returns the context block with an intro appropriate to the confidentiality level.
 */
function buildContextBlock(
  contextParts: string[],
  guardrails: AgentGuardrails | null | undefined
): string {
  if (contextParts.length === 0) return '';

  const body = contextParts.join('\n\n---\n');

  if (guardrails?.confidentiality === 'strict') {
    return (
      `\n\nThe following is the ONLY information you may use to answer. ` +
      `Do not use any knowledge outside of this context:\n\n---\n${body}\n---`
    );
  }

  return (
    `\n\nUse the following information from the company's knowledge base to answer the user's question. ` +
    `Where this context directly addresses the question, prioritise it over your general training knowledge — ` +
    `answer as a knowledgeable representative of this specific company.\n\n---\n${body}\n---`
  );
}

export function buildPrompt(
  systemPrompt: string,
  retrievedChunks: RetrievedChunk[],
  conversationHistory: HistoryMessage[],
  userMessage: string,
  guardrails?: AgentGuardrails | null
): { role: string; content: string }[] {
  // Build context parts from retrieved chunks
  const contextParts: string[] = [];
  let contextTokens = 0;

  for (const chunk of retrievedChunks) {
    const label = chunk.data_source_name ? ` [Source: ${chunk.data_source_name}]` : '';
    const part = `${chunk.content}${label}`;
    const tokens = countTokens(part);

    if (contextTokens + tokens > MAX_CONTEXT_TOKENS) break;
    contextParts.push(part);
    contextTokens += tokens;
  }

  const guardrailsBlock = buildGuardrailsInstructions(guardrails);
  const contextBlock = buildContextBlock(contextParts, guardrails);

  const fullSystemPrompt = systemPrompt + guardrailsBlock + contextBlock;

  // Truncate conversation history if needed
  const truncatedHistory = truncateHistory(conversationHistory, MAX_HISTORY_TOKENS);

  return [
    { role: 'system', content: fullSystemPrompt },
    ...truncatedHistory,
    { role: 'user', content: userMessage },
  ];
}
