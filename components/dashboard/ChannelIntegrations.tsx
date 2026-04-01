'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from '@/components/ui/Toast';

interface ChannelIntegration {
  id: string;
  channel: 'messenger' | 'instagram' | 'whatsapp' | 'email';
  page_id: string;
  page_name: string;
  instagram_username?: string;
  is_active: boolean;
  created_at: string;
}

interface ChannelIntegrationsProps {
  agentId: string;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function MessengerIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.145 2 11.259c0 2.913 1.454 5.512 3.726 7.21V21l2.608-1.43c.696.192 1.433.295 2.195.295.078 0 .156-.001.233-.003A9.39 9.39 0 0012 20c5.523 0 10-4.145 10-9.259C22 6.145 17.523 2 12 2zm1 12.458l-2.545-2.71-4.97 2.71 5.467-5.8 2.607 2.71 4.91-2.71-5.47 5.8z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Channel card
// ---------------------------------------------------------------------------
interface ChannelCardProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  accentColor: string;
  connected: ChannelIntegration[];
  connectHref?: string;
  onDisconnect: (id: string, name: string) => void;
  comingSoon?: boolean;
}

function ChannelCard({
  icon, name, description, accentColor,
  connected, connectHref, onDisconnect, comingSoon,
}: ChannelCardProps) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-white">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: accentColor }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary">{name}</p>
          <p className="text-xs text-muted truncate">{description}</p>
        </div>
        {comingSoon ? (
          <span className="text-[10px] font-medium text-muted bg-surface-hover rounded-full px-2.5 py-1 shrink-0">
            Coming soon
          </span>
        ) : connected.length > 0 ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        ) : (
          <span className="text-xs text-muted shrink-0">Not connected</span>
        )}
      </div>

      {/* Connected accounts */}
      {connected.length > 0 && (
        <div className="divide-y divide-border bg-white">
          {connected.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ background: accentColor + '33', color: accentColor }}>
                {(item.page_name || item.instagram_username || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">
                  {item.channel === 'instagram'
                    ? `@${item.instagram_username || item.page_name}`
                    : item.page_name}
                </p>
                <p className="text-xs text-muted">ID: {item.page_id}</p>
              </div>
              <button
                onClick={() => onDisconnect(item.id, item.page_name || item.instagram_username || 'page')}
                className="text-xs text-muted hover:text-destructive transition-colors shrink-0"
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer actions */}
      {!comingSoon && (
        <div className="px-5 py-3 bg-surface-hover/50 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted">
            {connected.length === 0
              ? 'No accounts connected yet.'
              : `${connected.length} account${connected.length > 1 ? 's' : ''} connected.`}
          </p>
          {connectHref && (
            <a
              href={connectHref}
              className="text-xs font-medium text-primary hover:underline transition-colors"
            >
              {connected.length > 0 ? 'Connect another →' : 'Connect →'}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ChannelIntegrations({ agentId }: ChannelIntegrationsProps) {
  const [integrations, setIntegrations] = useState<ChannelIntegration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = useCallback(() => {
    fetch(`/api/agents/${agentId}/channels`)
      .then((r) => r.json())
      .then((j) => { setIntegrations(j.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agentId]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Check for success/error params in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('channel_success')) {
      const m = params.get('messenger') ?? '0';
      const ig = params.get('instagram') ?? '0';
      const parts = [];
      if (parseInt(m) > 0) parts.push(`${m} Messenger page${parseInt(m) > 1 ? 's' : ''}`);
      if (parseInt(ig) > 0) parts.push(`${ig} Instagram account${parseInt(ig) > 1 ? 's' : ''}`);
      toast(`Connected: ${parts.join(' and ') || 'channels'}`, 'success');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      fetchIntegrations();
    }
    if (params.get('channel_error')) {
      const errMap: Record<string, string> = {
        cancelled: 'Connection cancelled.',
        invalid_state: 'Session expired. Please try again.',
        no_pages: 'No Facebook Pages found on your account.',
        auth_failed: 'Authentication failed. Please try again.',
      };
      toast(errMap[params.get('channel_error')!] ?? 'Connection failed.', 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchIntegrations]);

  async function handleDisconnect(integrationId: string, pageName: string) {
    if (!confirm(`Disconnect "${pageName}"? This agent will stop responding to messages from this account.`)) return;

    const res = await fetch(`/api/agents/${agentId}/channels?integration_id=${integrationId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.error) {
      toast(json.error, 'error');
    } else {
      toast('Disconnected', 'success');
      fetchIntegrations();
    }
  }

  const messenger = integrations.filter((i) => i.channel === 'messenger');
  const instagram = integrations.filter((i) => i.channel === 'instagram');
  const whatsapp  = integrations.filter((i) => i.channel === 'whatsapp');

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" /></div>;
  }

  const connectUrl = `/api/integrations/facebook/connect?agent_id=${agentId}`;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-primary">Channel Integrations</h2>
        <p className="text-xs text-muted mt-0.5">
          Connect this agent to messaging channels. It will automatically reply to incoming messages.
        </p>
      </div>

      <ChannelCard
        icon={<MessengerIcon />}
        name="Facebook Messenger"
        description="Auto-reply to messages sent to your Facebook Pages"
        accentColor="#0084FF"
        connected={messenger}
        connectHref={connectUrl}
        onDisconnect={handleDisconnect}
      />

      <ChannelCard
        icon={<InstagramIcon />}
        name="Instagram"
        description="Auto-reply to Instagram DMs from Professional accounts"
        accentColor="#E1306C"
        connected={instagram}
        connectHref={connectUrl}
        onDisconnect={handleDisconnect}
      />

      <ChannelCard
        icon={<WhatsAppIcon />}
        name="WhatsApp"
        description="Auto-reply to WhatsApp messages via the Meta Business Cloud API"
        accentColor="#25D366"
        connected={whatsapp}
        onDisconnect={handleDisconnect}
        comingSoon
      />

      <ChannelCard
        icon={<EmailIcon />}
        name="Email"
        description="Automatically respond to inbound emails with AI-generated replies"
        accentColor="#6366f1"
        connected={[]}
        onDisconnect={handleDisconnect}
        comingSoon
      />

      <p className="text-xs text-muted pt-1">
        Connecting Facebook also connects any linked Instagram Professional accounts automatically.
        Human takeover mode works across all channels.
      </p>
    </div>
  );
}
