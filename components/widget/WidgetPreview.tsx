'use client';

import { WidgetConfig } from '@/lib/types/database';

export function WidgetPreview({ config }: { config: WidgetConfig }) {
  const primaryColor = config.primary_color || '#6366f1';
  const bubbleColor = config.bubble_color || primaryColor;
  const theme = config.theme || 'light';
  const alignment = config.bubble_alignment || 'right';
  const headerBg = config.use_primary_for_header !== false ? primaryColor : (theme === 'dark' ? '#2a2a4a' : '#f9fafb');
  const headerText = config.use_primary_for_header !== false ? '#ffffff' : (theme === 'dark' ? '#e5e5e5' : '#1a1a1a');

  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <h3 className="font-semibold text-primary mb-4">Preview</h3>
      <div className="bg-surface-hover rounded-lg p-4 relative h-[480px] overflow-hidden">
        {/* Mock chat window */}
        <div className={`absolute bottom-16 ${alignment === 'left' ? 'left-4' : 'right-4'} w-[320px]`}>
          <div className={`rounded-xl shadow-xl overflow-hidden ${theme === 'dark' ? 'bg-primary' : 'bg-white'}`}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-2.5" style={{ backgroundColor: headerBg, color: headerText }}>
              {config.profile_picture_url && (
                <img src={config.profile_picture_url} alt="" className="w-7 h-7 rounded-full object-cover" />
              )}
              <span className="text-sm font-semibold">{config.display_name || 'Chat Assistant'}</span>
            </div>

            {/* Messages area */}
            <div className={`p-4 h-[220px] flex flex-col justify-end gap-2 ${theme === 'dark' ? 'bg-primary' : 'bg-white'}`}>
              {/* Dismissible notice */}
              {config.dismissible_notice && (
                <div className={`text-[10px] px-3 py-2 rounded-lg border ${theme === 'dark' ? 'border-white/20 text-muted bg-primary' : 'border-border text-muted bg-surface-hover'}`}>
                  {config.dismissible_notice}
                  <span className="ml-2 text-muted cursor-pointer">✕</span>
                </div>
              )}

              {/* Initial message */}
              {config.initial_message && (
                <div className={`text-xs px-3 py-2 rounded-lg max-w-[85%] ${theme === 'dark' ? 'bg-primary text-white/80' : 'bg-surface-hover text-primary'}`}>
                  {config.initial_message}
                </div>
              )}

              {/* Suggested messages */}
              {config.suggested_messages && config.suggested_messages.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {config.suggested_messages.slice(0, 3).map((msg, i) => (
                    <div
                      key={i}
                      className="text-[10px] px-2.5 py-1 rounded-full border max-w-fit cursor-pointer"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      {msg}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {config.footer_text && (
              <div className={`text-center text-[9px] py-1.5 ${theme === 'dark' ? 'text-muted-foreground border-t border-white/10' : 'text-muted border-t border-border'}`}>
                {config.footer_text}
              </div>
            )}

            {/* Input */}
            <div className={`px-3 py-2.5 border-t flex items-center gap-2 ${theme === 'dark' ? 'border-white/20' : 'border-border'}`}>
              {config.voice_to_text && (
                <div className="text-muted text-xs">🎤</div>
              )}
              <div className={`flex-1 text-[10px] px-2.5 py-1.5 rounded-lg ${theme === 'dark' ? 'bg-primary text-muted' : 'bg-surface-hover text-muted'}`}>
                {config.message_placeholder || 'Message...'}
              </div>
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                <span className="text-white text-[10px]">→</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bubble */}
        <div
          className={`absolute bottom-4 ${alignment === 'left' ? 'left-4' : 'right-4'} w-12 h-12 rounded-full flex items-center justify-center shadow-lg`}
          style={{ backgroundColor: bubbleColor }}
        >
          {config.chat_icon_url ? (
            <img src={config.chat_icon_url} alt="" className="w-6 h-6" />
          ) : (
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
