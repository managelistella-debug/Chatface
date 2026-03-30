import { getOpenAIModel } from './openai-client';
import { getAnthropicModel } from './anthropic-client';
import type { LanguageModel } from 'ai';

const MODEL_MAP: Record<string, { provider: 'openai' | 'anthropic'; modelId: string }> = {
  'gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini' },
  'gpt-4o': { provider: 'openai', modelId: 'gpt-4o' },
  'claude-sonnet': { provider: 'anthropic', modelId: 'claude-sonnet-4-20250514' },
  'claude-haiku': { provider: 'anthropic', modelId: 'claude-haiku-4-5-20251001' },
};

export function getLLMClient(model: string): LanguageModel {
  const config = MODEL_MAP[model];
  if (!config) throw new Error(`Unsupported model: ${model}`);

  if (config.provider === 'openai') {
    return getOpenAIModel(config.modelId);
  } else {
    return getAnthropicModel(config.modelId);
  }
}
