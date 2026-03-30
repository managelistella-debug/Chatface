import { AIAction } from '@/lib/types/database';

export function detectActionIntent(message: string, actions: AIAction[]): AIAction | null {
  const lowerMessage = message.toLowerCase().trim();

  const enabledActions = actions.filter((a) => a.is_enabled);
  if (enabledActions.length === 0) return null;

  let bestMatch: AIAction | null = null;
  let bestScore = 0;

  for (const action of enabledActions) {
    let score = 0;

    // Check action description keywords against message
    if (action.description) {
      const descWords = action.description.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const matchCount = descWords.filter((w) => lowerMessage.includes(w)).length;
      score = descWords.length > 0 ? matchCount / descWords.length : 0;
    }

    // Boost score for specific action type triggers
    if (action.type === 'lead_collection') {
      const leadTriggers = ['contact', 'email', 'phone', 'reach out', 'get in touch', 'call me', 'sign up', 'subscribe', 'my name is', 'my email'];
      for (const trigger of leadTriggers) {
        if (lowerMessage.includes(trigger)) score += 0.5;
      }
    }

    if (action.type === 'web_search') {
      const searchTriggers = ['search', 'look up', 'find out', 'what is the latest', 'current', 'recent news', 'google'];
      for (const trigger of searchTriggers) {
        if (lowerMessage.includes(trigger)) score += 0.5;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = action;
    }
  }

  // Only return a match if the score is meaningful
  return bestScore >= 0.3 ? bestMatch : null;
}
