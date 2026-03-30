'use client';

import { ChatPlayground } from '@/components/chat/ChatPlayground';
import { WidgetConfig } from '@/lib/types/database';

interface SharedChatProps {
  agentId: string;
  agent: {
    id: string;
    name: string;
    widget_config: WidgetConfig;
  };
}

export function SharedChat({ agentId, agent }: SharedChatProps) {
  const wc = agent.widget_config || {};
  const primaryColor = wc.primary_color || '#6366f1';
  const displayName = wc.display_name || agent.name || 'Chat';
  const theme = wc.theme || 'light';

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4"
      style={{
        background: theme === 'dark'
          ? 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)'
          : 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 100%)',
      }}
    >
      {/* Header */}
      <div className="w-full max-w-2xl mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          {wc.profile_picture_url ? (
            <img
              src={wc.profile_picture_url}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          )}
          <span
            className="text-base font-semibold"
            style={{ color: theme === 'dark' ? '#f9fafb' : '#111827' }}
          >
            {displayName}
          </span>
        </div>

        {/* Powered by badge (hidden if branding disabled) */}
        {!wc.hide_branding && (
          <span className="text-xs text-gray-400">
            {wc.footer_text || 'Powered by Chatface'}
          </span>
        )}
      </div>

      {/* Chat window */}
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{
          height: 'min(680px, calc(100vh - 120px))',
          background: theme === 'dark' ? '#1a1a2e' : '#ffffff',
        }}
      >
        <ChatPlayground
          agentId={agentId}
          widgetConfig={wc}
          displayName={displayName}
        />
      </div>
    </div>
  );
}
