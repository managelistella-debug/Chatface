/**
 * Meta (Facebook/Instagram) Graph API helpers.
 * All requests target Graph API v21.0.
 */

const BASE = 'https://graph.facebook.com/v21.0';

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_account_id?: string;
  instagram_username?: string;
}

// ---------------------------------------------------------------------------
// OAuth token exchange
// ---------------------------------------------------------------------------

/** Exchange short-lived code for a short-lived user access token */
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const url = new URL(`${BASE}/oauth/access_token`);
  url.searchParams.set('client_id', process.env.META_APP_ID!);
  url.searchParams.set('client_secret', process.env.META_APP_SECRET!);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);

  const res = await fetch(url.toString());
  const json = await res.json() as { access_token?: string; error?: { message: string } };
  if (!res.ok || !json.access_token) throw new Error(json.error?.message ?? 'Failed to exchange code');
  return json.access_token;
}

/** Exchange short-lived user token for a long-lived one (60 days) */
export async function getLongLivedToken(shortToken: string): Promise<string> {
  const url = new URL(`${BASE}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', process.env.META_APP_ID!);
  url.searchParams.set('client_secret', process.env.META_APP_SECRET!);
  url.searchParams.set('fb_exchange_token', shortToken);

  const res = await fetch(url.toString());
  const json = await res.json() as { access_token?: string; error?: { message: string } };
  if (!res.ok || !json.access_token) throw new Error(json.error?.message ?? 'Failed to get long-lived token');
  return json.access_token;
}

// ---------------------------------------------------------------------------
// Pages & Instagram accounts
// ---------------------------------------------------------------------------

/** Get all Facebook Pages the user manages, including their long-lived page tokens */
export async function getUserPages(userToken: string): Promise<MetaPage[]> {
  const url = new URL(`${BASE}/me/accounts`);
  url.searchParams.set('access_token', userToken);
  url.searchParams.set('fields', 'id,name,access_token');

  const res = await fetch(url.toString());
  const json = await res.json() as { data?: { id: string; name: string; access_token: string }[]; error?: { message: string } };
  if (!res.ok) throw new Error(json.error?.message ?? 'Failed to get pages');
  return json.data ?? [];
}

/** Get the Instagram Business Account linked to a Facebook Page */
export async function getInstagramAccount(pageId: string, pageToken: string): Promise<{ id: string; username: string } | null> {
  const url = new URL(`${BASE}/${pageId}`);
  url.searchParams.set('fields', 'instagram_business_account{id,username}');
  url.searchParams.set('access_token', pageToken);

  const res = await fetch(url.toString());
  const json = await res.json() as {
    instagram_business_account?: { id: string; username: string };
    error?: { message: string };
  };
  if (!res.ok || !json.instagram_business_account) return null;
  return json.instagram_business_account;
}

// ---------------------------------------------------------------------------
// Webhook page subscription
// ---------------------------------------------------------------------------

/** Subscribe a page to receive webhook events from this app */
export async function subscribePageToWebhook(pageId: string, pageToken: string): Promise<void> {
  const res = await fetch(
    `${BASE}/${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=${pageToken}`,
    { method: 'POST' }
  );
  if (!res.ok) {
    const json = await res.json() as { error?: { message: string } };
    console.error('Page webhook subscription failed:', json.error?.message);
  }
}

// ---------------------------------------------------------------------------
// Send messages
// ---------------------------------------------------------------------------

/** Send a Messenger reply to a user */
export async function sendMessengerMessage(pageAccessToken: string, recipientPsid: string, text: string): Promise<void> {
  const res = await fetch(`${BASE}/me/messages?access_token=${pageAccessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientPsid },
      message: { text: text.substring(0, 2000) }, // Messenger 2000 char limit
    }),
  });
  if (!res.ok) {
    const json = await res.json();
    console.error('Messenger send failed:', json);
  }
}

/** Send an Instagram DM reply */
export async function sendInstagramMessage(igUserId: string, pageAccessToken: string, recipientIgsid: string, text: string): Promise<void> {
  const res = await fetch(`${BASE}/${igUserId}/messages?access_token=${pageAccessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { text: text.substring(0, 1000) }, // Instagram 1000 char limit
    }),
  });
  if (!res.ok) {
    const json = await res.json();
    console.error('Instagram send failed:', json);
  }
}

/** Send a WhatsApp reply via the Cloud API */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  wabaToken: string,
  recipientPhone: string,
  text: string
): Promise<void> {
  const res = await fetch(`${BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${wabaToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientPhone,
      type: 'text',
      text: { body: text.substring(0, 4096) }, // WhatsApp 4096 char limit
    }),
  });
  if (!res.ok) {
    const json = await res.json();
    console.error('WhatsApp send failed:', json);
  }
}

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

/** Verify the X-Hub-Signature-256 header from Meta */
export async function verifyMetaSignature(payload: string, signature: string): Promise<boolean> {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return false;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(payload);

  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  const expected = `sha256=${hex}`;

  // Constant-time comparison
  if (signature.length !== expected.length) return false;
  const a = encoder.encode(signature);
  const b = encoder.encode(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
