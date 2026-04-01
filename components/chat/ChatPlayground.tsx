'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { WidgetConfig, LeadCaptureConfig } from '@/lib/types/database';
import ReactMarkdown from 'react-markdown';

interface ChatPlaygroundProps {
  agentId: string;
  /** Pre-loaded config — if omitted the component fetches it */
  widgetConfig?: WidgetConfig;
  /** Pre-loaded lead capture config */
  leadCaptureConfig?: LeadCaptureConfig | null;
  /** Display name shown in the header */
  displayName?: string;
}

export function ChatPlayground({ agentId, widgetConfig: configProp, leadCaptureConfig: leadConfigProp, displayName: nameProp }: ChatPlaygroundProps) {
  const { messages, isStreaming, sendMessage, reset, conversationId } = useChat(agentId);
  const [input, setInput] = useState('');
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(configProp ?? null);
  const [leadCaptureConfig, setLeadCaptureConfig] = useState<LeadCaptureConfig | null>(leadConfigProp ?? null);
  const [displayName, setDisplayName] = useState(nameProp ?? '');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lead capture state
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadSkipped, setLeadSkipped] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');

  // Fetch agent config unless it was passed in
  useEffect(() => {
    if (configProp) return;
    fetch(`/api/agents/${agentId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setWidgetConfig(j.data.widget_config || {});
          setDisplayName(j.data.widget_config?.display_name || j.data.name || 'AI Assistant');
          setLeadCaptureConfig(j.data.lead_capture ?? null);
        }
      })
      .catch(() => {});
  }, [agentId, configProp]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Lead capture visibility logic
  const userMsgCount = messages.filter((m) => m.role === 'user').length;
  const lc = leadCaptureConfig;
  const showLeadForm =
    lc?.enabled === true &&
    !leadCaptured &&
    !leadSkipped &&
    (lc.timing === 'start' ||
      (lc.timing === 'after_messages' && userMsgCount >= (lc.after_messages_count ?? 3)));

  // Block input when lead form is showing and bypass not allowed
  const inputBlocked = showLeadForm && lc?.allow_bypass === false;

  // Validate required lead fields before submit
  function isLeadFormValid() {
    if (!lc) return true;
    if (lc.fields.name && !leadName.trim()) return false;
    if (lc.fields.email && !leadEmail.trim()) return false;
    if (lc.fields.phone && !leadPhone.trim()) return false;
    return true;
  }

  async function handleLeadSubmit() {
    setLeadSubmitting(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          conversation_id: conversationId ?? null,
          name: leadName.trim() || undefined,
          email: leadEmail.trim() || undefined,
          phone: leadPhone.trim() || undefined,
        }),
      });
    } catch {
      // silent — don't block the user even if save fails
    } finally {
      setLeadSubmitting(false);
      setLeadCaptured(true);
    }
  }

  function handleLeadSkip() {
    setLeadSkipped(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming || inputBlocked) return;
    sendMessage(input.trim());
    setInput('');
  }

  function handleSuggestion(text: string) {
    if (isStreaming || inputBlocked) return;
    sendMessage(text);
  }

  function handleReset() {
    reset();
    setLeadCaptured(false);
    setLeadSkipped(false);
    setLeadName('');
    setLeadEmail('');
    setLeadPhone('');
  }

  // Parse initial messages (newline-separated string)
  const initialMessages = (widgetConfig?.initial_message || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  // Suggested message chips
  const suggestions = widgetConfig?.suggested_messages ?? [];
  const showSuggestions =
    suggestions.length > 0 &&
    (messages.length === 0 || (widgetConfig?.keep_suggestions_after_first && messages.length < 2));

  // Typing indicator: streaming with empty last assistant message
  const lastMsg = messages[messages.length - 1];
  const showTyping = isStreaming && lastMsg?.role === 'assistant' && !lastMsg.content;

  const primaryColor = widgetConfig?.primary_color || '#0a0a0b';

  return (
    <div className="flex flex-col h-full min-h-[400px] bg-white rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border"
        style={widgetConfig?.use_primary_for_header !== false ? { background: primaryColor } : {}}
      >
        <div className="flex items-center gap-2.5">
          {widgetConfig?.profile_picture_url ? (
            <img
              src={widgetConfig.profile_picture_url}
              alt="Agent"
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{ background: widgetConfig?.use_primary_for_header !== false ? 'rgba(255,255,255,0.2)' : primaryColor, color: '#fff' }}
            >
              {(displayName || 'A').charAt(0).toUpperCase()}
            </div>
          )}
          <span
            className="text-sm font-semibold"
            style={{ color: widgetConfig?.use_primary_for_header !== false ? '#fff' : 'var(--color-primary)' }}
          >
            {displayName || 'AI Assistant'}
          </span>
        </div>
        <button
          onClick={handleReset}
          className="text-xs transition-colors opacity-70 hover:opacity-100"
          style={{ color: widgetConfig?.use_primary_for_header !== false ? '#fff' : 'var(--color-muted)' }}
          title="Reset conversation"
        >
          Reset
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Initial greeting messages */}
        {initialMessages.length > 0 && messages.length === 0 && (
          <div className="space-y-2">
            {initialMessages.map((msg, i) => (
              <div key={i} className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed bg-surface-hover text-primary">
                  {msg}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state (no greeting configured, no lead form) */}
        {initialMessages.length === 0 && messages.length === 0 && !showLeadForm && (
          <div className="flex flex-col items-center justify-center h-full text-center pt-8">
            <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-sm text-muted">Send a message to test your agent</p>
          </div>
        )}

        {/* Conversation messages */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-br-sm text-white'
                  : 'rounded-bl-sm bg-surface-hover text-primary'
              }`}
              style={msg.role === 'user' ? { background: primaryColor } : {}}
            >
              {msg.role === 'user' ? (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              ) : (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="mb-2 last:mb-0 space-y-1 pl-1">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-2 last:mb-0 space-y-1 pl-1 list-decimal list-inside">{children}</ol>,
                    li: ({ children }) => (
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
                        <span>{children}</span>
                      </li>
                    ),
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => (
                      <code className="px-1 py-0.5 rounded bg-black/10 text-xs font-mono">{children}</code>
                    ),
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100">{children}</a>
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {showTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-surface-hover">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Lead capture form — appears inline in the message stream */}
        {showLeadForm && lc && (
          <div className="flex justify-start">
            <div className="w-full max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border" style={{ background: `${primaryColor}10` }}>
                <p className="text-sm font-semibold text-primary">
                  {lc.timing === 'start' ? 'Before we get started…' : 'Before we continue…'}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {lc.allow_bypass
                    ? 'Share your contact details so we can follow up if needed (optional).'
                    : 'Please provide your contact details to continue the conversation.'}
                </p>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {lc.fields.name && (
                  <input
                    type="text"
                    placeholder="Full name"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                  />
                )}
                {lc.fields.email && (
                  <input
                    type="email"
                    placeholder="Email address"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                  />
                )}
                {lc.fields.phone && (
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                  />
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleLeadSubmit}
                    disabled={!isLeadFormValid() || leadSubmitting}
                    className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
                    style={{ background: primaryColor }}
                  >
                    {leadSubmitting ? 'Saving…' : 'Continue'}
                  </button>
                  {lc.allow_bypass && (
                    <button
                      onClick={handleLeadSkip}
                      className="px-3 py-2 rounded-lg text-sm text-muted hover:text-primary transition-colors"
                    >
                      Skip
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested message chips */}
      {showSuggestions && !showLeadForm && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestion(s)}
              disabled={isStreaming}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-white hover:bg-surface-hover text-primary transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            inputBlocked
              ? 'Please provide your details above to continue…'
              : widgetConfig?.message_placeholder || 'Message…'
          }
          className="flex-1 px-3.5 py-2 border border-border rounded-lg text-sm bg-white text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 disabled:bg-surface-hover disabled:cursor-not-allowed"
          disabled={isStreaming || inputBlocked}
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming || inputBlocked}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-white disabled:opacity-40 transition-colors"
          style={{ background: primaryColor }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </form>

      {/* Footer branding */}
      {widgetConfig?.footer_text !== undefined ? (
        widgetConfig.footer_text ? (
          <div className="text-center text-[10px] text-muted py-1.5 border-t border-border">
            {widgetConfig.footer_text}
          </div>
        ) : null
      ) : (
        <div className="text-center text-[10px] text-muted py-1.5 border-t border-border">
          Powered by ChatFace
        </div>
      )}
    </div>
  );
}
