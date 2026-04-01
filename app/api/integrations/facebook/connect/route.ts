/**
 * Start the Facebook OAuth flow.
 * GET /api/integrations/facebook/connect?agent_id=xxx
 * Generates a CSRF state token, stores it, then redirects to Meta's OAuth dialog.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/supabase/server-auth';

const SCOPES = [
  'pages_messaging',
  'pages_manage_metadata',
  'pages_read_engagement',
  'pages_show_list',
  'instagram_basic',
  'instagram_manage_messages',
].join(',');

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  if (!agentId) return NextResponse.json({ error: 'agent_id required' }, { status: 400 });

  // Verify the caller owns this agent
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id')
    .eq('id', agentId)
    .eq('user_id', user.id)
    .single();

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  // Generate random CSRF state and store it
  const state = crypto.randomUUID();
  await supabaseAdmin.from('oauth_states').insert({
    state,
    agent_id: agentId,
    channel: 'facebook',
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://chatface-delta.vercel.app';
  const redirectUri = `${appUrl}/api/integrations/facebook/callback`;

  const oauthUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  oauthUrl.searchParams.set('client_id', process.env.META_APP_ID!);
  oauthUrl.searchParams.set('redirect_uri', redirectUri);
  oauthUrl.searchParams.set('scope', SCOPES);
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('state', state);

  return NextResponse.redirect(oauthUrl.toString());
}
