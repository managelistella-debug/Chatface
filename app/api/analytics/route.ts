import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  if (!agentId) return errorResponse('agent_id is required', 400);

  const period = request.nextUrl.searchParams.get('period') || '30d';

  // Calculate date range
  let dateFilter: string | null = null;
  const now = new Date();
  if (period === '7d') {
    dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (period === '30d') {
    dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (period === '90d') {
    dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  }
  // 'all' => dateFilter stays null

  try {
    // Fetch conversations — select only base columns that always exist;
    // extended columns (sentiment, confidence_score, is_human_takeover) are
    // added by migration 003 and handled separately below.
    let conversationQuery = supabaseAdmin
      .from('conversations')
      .select('id, title, created_at')
      .eq('agent_id', agentId);
    if (dateFilter) conversationQuery = conversationQuery.gte('created_at', dateFilter);
    const { data: conversations, error: convError } = await conversationQuery;
    if (convError) return errorResponse(convError.message);

    // Try to fetch extended columns (only available after migration 003)
    let extendedConvData: { id: string; sentiment: string | null; confidence_score: number | null; is_human_takeover: boolean }[] = [];
    if ((conversations || []).length > 0) {
      const ids = (conversations || []).map((c) => c.id);
      const { data: ext } = await supabaseAdmin
        .from('conversations')
        .select('id, sentiment, confidence_score, is_human_takeover')
        .in('id', ids);
      extendedConvData = (ext as typeof extendedConvData) || [];
    }

    const conversationIds = (conversations || []).map((c) => c.id);
    const totalConversations = conversationIds.length;

    // Fetch messages — base columns only
    let messages: { id: string; conversation_id: string; created_at: string }[] = [];
    if (conversationIds.length > 0) {
      let msgQuery = supabaseAdmin
        .from('messages')
        .select('id, conversation_id, created_at')
        .in('conversation_id', conversationIds);
      if (dateFilter) msgQuery = msgQuery.gte('created_at', dateFilter);
      const { data: msgData, error: msgError } = await msgQuery;
      if (msgError) return errorResponse(msgError.message);
      messages = msgData || [];
    }

    // Try to fetch feedback column (added by migration 003)
    let messageFeedback: { id: string; feedback: string | null }[] = [];
    if (messages.length > 0) {
      const msgIds = messages.map((m) => m.id);
      const { data: fbData } = await supabaseAdmin
        .from('messages')
        .select('id, feedback')
        .in('id', msgIds);
      messageFeedback = (fbData as typeof messageFeedback) || [];
    }

    const totalMessages = messages.length;
    const avgMessagesPerConversation =
      totalConversations > 0 ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0;

    // Leads count
    let leadsQuery = supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId);
    if (dateFilter) leadsQuery = leadsQuery.gte('created_at', dateFilter);
    const { count: totalLeads, error: leadsError } = await leadsQuery;
    if (leadsError) return errorResponse(leadsError.message);

    // Feedback stats (from extended feedback data if available)
    const thumbsUp = messageFeedback.filter((m) => m.feedback === 'thumbs_up').length;
    const thumbsDown = messageFeedback.filter((m) => m.feedback === 'thumbs_down').length;
    const totalFeedback = thumbsUp + thumbsDown;
    const responseQuality = totalFeedback > 0 ? Math.round((thumbsUp / totalFeedback) * 100) : 0;

    // Conversations by day
    const convByDay: Record<string, number> = {};
    for (const c of conversations || []) {
      const day = c.created_at.slice(0, 10);
      convByDay[day] = (convByDay[day] || 0) + 1;
    }
    const conversationsByDay = Object.entries(convByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Messages by day
    const msgByDay: Record<string, number> = {};
    for (const m of messages) {
      const day = m.created_at.slice(0, 10);
      msgByDay[day] = (msgByDay[day] || 0) + 1;
    }
    const messagesByDay = Object.entries(msgByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Sentiment distribution (uses extended columns if available)
    const sentimentDistribution = { positive: 0, neutral: 0, negative: 0 };
    for (const c of extendedConvData) {
      if (c.sentiment === 'positive') sentimentDistribution.positive++;
      else if (c.sentiment === 'negative') sentimentDistribution.negative++;
      else sentimentDistribution.neutral++;
    }
    // If no extended data yet, mark all as neutral
    if (extendedConvData.length === 0 && totalConversations > 0) {
      sentimentDistribution.neutral = totalConversations;
    }

    // Top topics from conversation titles
    const topicCounts: Record<string, number> = {};
    for (const c of conversations || []) {
      const title = (c.title || '').trim();
      if (title && title !== 'New Conversation') {
        topicCounts[title] = (topicCounts[title] || 0) + 1;
      }
    }
    const topTopics = Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Avg confidence score (extended only)
    const confidenceScores = extendedConvData
      .map((c) => c.confidence_score)
      .filter((s): s is number => s != null);
    const avgConfidenceScore =
      confidenceScores.length > 0
        ? Math.round((confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length) * 100) / 100
        : 0;

    // Human takeover count (extended only)
    const humanTakeoverCount = extendedConvData.filter((c) => c.is_human_takeover).length;

    return successResponse({
      total_conversations: totalConversations,
      total_messages: totalMessages,
      avg_messages_per_conversation: avgMessagesPerConversation,
      total_leads: totalLeads || 0,
      feedback_stats: { thumbs_up: thumbsUp, thumbs_down: thumbsDown },
      conversations_by_day: conversationsByDay,
      messages_by_day: messagesByDay,
      sentiment_distribution: sentimentDistribution,
      top_topics: topTopics,
      avg_confidence_score: avgConfidenceScore,
      human_takeover_count: humanTakeoverCount,
      response_quality: responseQuality,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error');
  }
}
