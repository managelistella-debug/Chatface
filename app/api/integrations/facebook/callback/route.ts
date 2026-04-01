/**
 * Facebook OAuth callback.
 * GET /api/integrations/facebook/callback?code=xxx&state=xxx
 * Exchanges code → tokens, fetches pages + IG accounts, stores integrations.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getUserPages,
  getInstagramAccount,
  subscribePageToWebhook,
} from '@/lib/integrations/meta';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://chatface-delta.vercel.app';

  // User cancelled or Meta returned an error
  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?channel_error=cancelled`);
  }

  // Validate CSRF state
  const { data: oauthState, error: stateErr } = await supabaseAdmin
    .from('oauth_states')
    .select('agent_id, expires_at')
    .eq('state', state)
    .single();

  if (stateErr || !oauthState || new Date(oauthState.expires_at) < new Date()) {
    return NextResponse.redirect(`${appUrl}/dashboard?channel_error=invalid_state`);
  }

  // Clean up state
  await supabaseAdmin.from('oauth_states').delete().eq('state', state);

  const agentId = oauthState.agent_id;
  const redirectBase = `${appUrl}/dashboard/agents/${agentId}/deploy`;

  try {
    const redirectUri = `${appUrl}/api/integrations/facebook/callback`;

    // Exchange code → short-lived token → long-lived token
    const shortToken = await exchangeCodeForToken(code, redirectUri);
    const longToken  = await getLongLivedToken(shortToken);

    // Get all managed pages
    const pages = await getUserPages(longToken);
    if (!pages.length) {
      return NextResponse.redirect(`${redirectBase}?channel_error=no_pages&tab=Channels`);
    }

    let messengerCount = 0;
    let instagramCount = 0;

    for (const page of pages) {
      // Subscribe page to our webhook
      await subscribePageToWebhook(page.id, page.access_token);

      // Upsert Messenger integration
      await supabaseAdmin.from('channel_integrations').upsert({
        agent_id: agentId,
        channel: 'messenger',
        page_id: page.id,
        page_name: page.name,
        page_access_token: page.access_token,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agent_id,channel,page_id' });

      messengerCount++;

      // Check for linked Instagram Business Account
      const igAccount = await getInstagramAccount(page.id, page.access_token);
      if (igAccount) {
        await supabaseAdmin.from('channel_integrations').upsert({
          agent_id: agentId,
          channel: 'instagram',
          page_id: igAccount.id,           // IG account ID as page_id for webhook routing
          page_name: igAccount.username,
          page_access_token: page.access_token,
          instagram_account_id: igAccount.id,
          instagram_username: igAccount.username,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'agent_id,channel,page_id' });

        instagramCount++;
      }
    }

    return NextResponse.redirect(
      `${redirectBase}?channel_success=1&messenger=${messengerCount}&instagram=${instagramCount}&tab=Channels`
    );
  } catch (err) {
    console.error('Facebook callback error:', err);
    return NextResponse.redirect(`${redirectBase}?channel_error=auth_failed&tab=Channels`);
  }
}
