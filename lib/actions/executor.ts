import { supabaseAdmin } from '@/lib/supabase/server';
import { AIAction } from '@/lib/types/database';
import { logError, log } from '@/lib/utils/logger';
import * as cheerio from 'cheerio';

export interface ActionResult {
  success: boolean;
  data?: unknown;
  message: string;
}

export async function executeAction(
  action: AIAction,
  actionParams: Record<string, unknown>,
  context: { agent_id: string; conversation_id: string }
): Promise<ActionResult> {
  const ctx = 'action-executor';

  try {
    switch (action.type) {
      case 'lead_collection':
        return await executeLeadCollection(action, actionParams, context);
      case 'web_search':
        return await executeWebSearch(action, actionParams);
      default:
        return { success: false, message: `Unknown action type: ${action.type}` };
    }
  } catch (err) {
    logError(ctx, `Action ${action.name} failed`, err);
    return { success: false, message: (err as Error).message };
  }
}

async function executeLeadCollection(
  action: AIAction,
  params: Record<string, unknown>,
  context: { agent_id: string; conversation_id: string }
): Promise<ActionResult> {
  const { name, email, phone, ...customFields } = params;

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({
      agent_id: context.agent_id,
      conversation_id: context.conversation_id,
      name: (name as string) || null,
      email: (email as string) || null,
      phone: (phone as string) || null,
      custom_fields: customFields,
    })
    .select()
    .single();

  if (error) throw error;

  // Record analytics event
  await supabaseAdmin.from('analytics_events').insert({
    agent_id: context.agent_id,
    event_type: 'lead_collected',
    event_data: { lead_id: data.id, email, conversation_id: context.conversation_id },
  });

  // Webhook if configured
  const config = action.config as { webhook_url?: string };
  if (config.webhook_url) {
    try {
      await fetch(config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: data, agent_id: context.agent_id }),
      });
    } catch (err) {
      log('action-executor', 'Webhook failed (non-critical):', (err as Error).message);
    }
  }

  return { success: true, data, message: 'Lead information collected successfully.' };
}

async function executeWebSearch(
  _action: AIAction,
  params: Record<string, unknown>
): Promise<ActionResult> {
  const query = params.query as string;
  if (!query) return { success: false, message: 'No search query provided' };

  const maxResults = (params.max_results as number) || 5;

  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ChatFace Bot/1.0' },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: { title: string; snippet: string; url: string }[] = [];
    $('.result').each((i, el) => {
      if (i >= maxResults) return false;
      const title = $(el).find('.result__title').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      const link = $(el).find('.result__url').text().trim();
      if (title) results.push({ title, snippet, url: link });
    });

    if (results.length === 0) {
      return { success: true, data: [], message: `No results found for "${query}".` };
    }

    const formatted = results
      .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}\n   ${r.url}`)
      .join('\n\n');

    return {
      success: true,
      data: results,
      message: `Here are the search results for "${query}":\n\n${formatted}`,
    };
  } catch {
    return { success: false, message: 'Web search failed. Please try again.' };
  }
}
