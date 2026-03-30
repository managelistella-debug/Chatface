import { openai } from '@ai-sdk/openai';

export function getOpenAIModel(modelId: string) {
  return openai(modelId);
}
