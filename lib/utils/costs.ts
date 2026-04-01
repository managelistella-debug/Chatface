/**
 * Per-model pricing in USD per 1,000,000 tokens (as of 2026-Q1).
 * Update these when provider pricing changes.
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':       { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':  { input: 0.15,  output: 0.60  },
  'claude-sonnet':{ input: 3.00,  output: 15.00 },
  'claude-haiku': { input: 0.80,  output: 4.00  },
};

const FALLBACK = MODEL_PRICING['gpt-4o'];

/**
 * Returns estimated USD cost for a single LLM call.
 */
export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const price = MODEL_PRICING[model] ?? FALLBACK;
  return (
    (promptTokens     / 1_000_000) * price.input +
    (completionTokens / 1_000_000) * price.output
  );
}

/**
 * Formats a USD cost for display (e.g. "$0.0032" or "$12.40").
 */
export function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(5)}`;
  return `$${usd.toFixed(2)}`;
}

/**
 * Formats a token count for display (e.g. "1.2M" or "847K").
 */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
