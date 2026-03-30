import { Tiktoken, getEncoding } from 'js-tiktoken';

let encoder: Tiktoken | null = null;

function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = getEncoding('cl100k_base');
  }
  return encoder;
}

export function countTokens(text: string): number {
  return getEncoder().encode(text).length;
}

export function truncateHistory(
  messages: { role: string; content: string }[],
  maxTokens: number
): { role: string; content: string }[] {
  const result: { role: string; content: string }[] = [];
  let totalTokens = 0;

  // Keep messages from most recent, working backwards
  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = countTokens(messages[i].content);
    if (totalTokens + tokens > maxTokens) break;
    totalTokens += tokens;
    result.unshift(messages[i]);
  }

  return result;
}
