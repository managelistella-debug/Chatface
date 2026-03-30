import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  if (!agentId) {
    return new Response('agent_id is required', { status: 400 });
  }

  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (error) return new Response(error.message, { status: 500 });

  // Build CSV
  const headers = ['ID', 'Name', 'Email', 'Phone', 'Created At', 'Custom Fields'];
  const rows = (leads || []).map((l) => [
    l.id,
    l.name || '',
    l.email || '',
    l.phone || '',
    l.created_at,
    JSON.stringify(l.custom_fields || {}),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="leads-${agentId}.csv"`,
    },
  });
}
