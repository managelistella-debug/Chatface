import { anthropic } from '@ai-sdk/anthropic';

export function getAnthropicModel(modelId: string) {
  return anthropic(modelId);
}
