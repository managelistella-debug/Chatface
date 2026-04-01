/**
 * Meta webhook — handles both Facebook Messenger and Instagram DMs.
 * GET  — webhook verification handshake
 * POST — incoming message events
 */
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyMetaSignature, sendMessengerMessage, sendInstagramMessage, sendWhatsAppMessage } from '@/lib/integrations/meta';
import { processChannelMessage } from '@/lib/integrations/process-channel-message';

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// GET — verify webhook during Meta App configuration
// ---------------------------------------------------------------------------
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode      = params.get('hub.mode');
  const token     = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

// ---------------------------------------------------------------------------
// POST — handle incoming messages
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256') ?? '';

  // Verify the payload came from Meta
  const valid = await verifyMetaSignature(rawBody, signature);
  if (!valid) {
    console.error('Meta webhook: invalid signature');
    return new Response('Forbidden', { status: 403 });
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MetaWebhookPayload;
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // Respond 200 immediately — Meta requires < 5s response
  // Process in background via after()
  after(async () => {
    try {
      await handleWebhookPayload(payload);
    } catch (err) {
      console.error('Meta webhook processing error:', err);
    }
  });

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Payload handler
// ---------------------------------------------------------------------------
async function handleWebhookPayload(payload: MetaWebhookPayload) {
  const { object, entry } = payload;

  // WhatsApp Cloud API has a different payload structure
  if (object === 'whatsapp_business_account') {
    await handleWhatsAppPayload(payload);
    return;
  }

  if (object !== 'page' && object !== 'instagram') return;

  const channel = object === 'instagram' ? 'instagram' : 'messenger';

  for (const ent of entry) {
    for (const event of ent.messaging ?? []) {
      // Skip echo events (messages sent by the page itself)
      if (event.message?.is_echo) continue;
      // Skip if no text
      const text = event.message?.text;
      if (!text) continue;

      const senderId    = event.sender.id;
      const recipientId = event.recipient.id; // Page ID or IG account ID

      // Look up which agent owns this page/account
      const { data: integration } = await supabaseAdmin
        .from('channel_integrations')
        .select('agent_id, page_access_token, instagram_account_id')
        .eq('page_id', recipientId)
        .eq('channel', channel)
        .eq('is_active', true)
        .single();

      if (!integration) {
        console.warn(`Meta webhook: no integration found for ${channel}:${recipientId}`);
        continue;
      }

      const userIdentifier = `${channel}:${senderId}`;

      // Generate AI response
      const replyText = await processChannelMessage(
        integration.agent_id,
        text,
        userIdentifier,
        channel
      );

      if (!replyText) continue; // human takeover or error

      // Send reply
      if (channel === 'messenger') {
        await sendMessengerMessage(integration.page_access_token, senderId, replyText);
      } else {
        // Instagram: use instagram_account_id as the sender identity
        const igAccountId = integration.instagram_account_id ?? recipientId;
        await sendInstagramMessage(igAccountId, integration.page_access_token, senderId, replyText);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// WhatsApp handler (Cloud API format differs from Messenger/IG)
// ---------------------------------------------------------------------------
async function handleWhatsAppPayload(payload: MetaWebhookPayload) {
  for (const ent of payload.entry) {
    const changes = (ent as unknown as { changes?: WhatsAppChange[] }).changes ?? [];
    for (const change of changes) {
      if (change.field !== 'messages') continue;
      const value = change.value;
      if (!value?.messages?.length) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      for (const msg of value.messages) {
        if (msg.type !== 'text') continue;
        const text = msg.text?.body;
        if (!text) continue;

        const senderPhone = msg.from;

        // Look up agent by WhatsApp phone number ID
        const { data: integration } = await supabaseAdmin
          .from('channel_integrations')
          .select('agent_id, page_access_token')
          .eq('page_id', phoneNumberId)
          .eq('channel', 'whatsapp')
          .eq('is_active', true)
          .single();

        if (!integration) {
          console.warn(`Meta webhook: no WhatsApp integration for phone_number_id ${phoneNumberId}`);
          continue;
        }

        const replyText = await processChannelMessage(
          integration.agent_id,
          text,
          `whatsapp:${senderPhone}`,
          'whatsapp'
        );

        if (!replyText) continue;

        await sendWhatsAppMessage(phoneNumberId, integration.page_access_token, senderPhone, replyText);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging: Array<{
      sender:    { id: string };
      recipient: { id: string };
      message?: {
        mid:      string;
        text?:    string;
        is_echo?: boolean;
      };
    }>;
  }>;
}

interface WhatsAppChange {
  field: string;
  value: {
    metadata?: { phone_number_id: string; display_phone_number: string };
    messages?: Array<{
      from: string;
      id:   string;
      type: string;
      text?: { body: string };
    }>;
  };
}
