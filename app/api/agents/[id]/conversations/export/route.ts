import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/utils/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv';

  // Get all conversations
  const { data: conversations, error: convError } = await supabaseAdmin
    .from('conversations')
    .select('id, title, created_at, updated_at, sentiment, user_identifier, is_human_takeover')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (convError) return errorResponse(convError.message);
  if (!conversations?.length) {
    return new Response('No conversations to export', { status: 200 });
  }

  const convIds = conversations.map((c) => c.id);

  const { data: messages, error: msgError } = await supabaseAdmin
    .from('messages')
    .select('id, conversation_id, role, content, feedback, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: true });

  if (msgError) return errorResponse(msgError.message);

  const msgsByConv = new Map<string, typeof messages>();
  for (const msg of messages || []) {
    if (!msgsByConv.has(msg.conversation_id)) msgsByConv.set(msg.conversation_id, []);
    msgsByConv.get(msg.conversation_id)!.push(msg);
  }

  if (format === 'json') {
    const out = conversations.map((c) => ({
      ...c,
      messages: msgsByConv.get(c.id) || [],
    }));
    return new Response(JSON.stringify(out, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="conversations-${agentId}.json"`,
      },
    });
  }

  // CSV
  const rows: string[] = [
    'conversation_id,conversation_title,started_at,user_identifier,sentiment,role,message,feedback',
  ];

  for (const conv of conversations) {
    const msgs = msgsByConv.get(conv.id) || [];
    if (msgs.length === 0) {
      rows.push(
        [conv.id, csv(conv.title), csv(conv.created_at), csv(conv.user_identifier || ''), csv(conv.sentiment || ''), '', '', ''].join(',')
      );
    } else {
      for (const msg of msgs) {
        rows.push(
          [
            conv.id,
            csv(conv.title),
            csv(conv.created_at),
            csv(conv.user_identifier || ''),
            csv(conv.sentiment || ''),
            msg.role,
            csv(msg.content),
            csv(msg.feedback || ''),
          ].join(',')
        );
      }
    }
  }

  return new Response(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="conversations-${agentId}.csv"`,
    },
  });
}

function csv(val: string): string {
  return `"${val.replace(/"/g, '""')}"`;
}
