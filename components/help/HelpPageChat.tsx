'use client';

import { useState, useRef, useEffect } from 'react';

interface HelpPageChatProps {
  agentId: string;
  agentName: string;
  primaryColor: string;
  profilePicture?: string;
  welcomeTitle: string;
  welcomeDescription: string;
  backgroundColor: string;
  textColor: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function HelpPageChat({
  agentId,
  agentName,
  primaryColor,
  profilePicture,
  welcomeTitle,
  welcomeDescription,
  backgroundColor,
  textColor,
}: HelpPageChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text?: string) {
    const message = text || input.trim();
    if (!message || isStreaming) return;
    setInput('');
    if (!started) setStarted(true);

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: message };
    const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    let fullContent = '';
    try {
      const res = await fetch('/api/widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, message, conversation_id: conversationId }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === 'text') {
              fullContent += parsed.content;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: fullContent } : m))
              );
            } else if (parsed.type === 'done' && parsed.conversation_id) {
              setConversationId(parsed.conversation_id);
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: 'Something went wrong. Please try again.' } : m))
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor, color: textColor }}>
      {/* Header */}
      <header className="text-white px-6 py-4 flex items-center gap-3 shadow-sm" style={{ backgroundColor: primaryColor }}>
        {profilePicture && (
          <img src={profilePicture} alt="" className="w-8 h-8 rounded-full object-cover" />
        )}
        <span className="font-semibold text-lg">{agentName}</span>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl w-full mx-auto flex flex-col">
        {!started && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
            <h1 className="text-3xl font-bold mb-3" style={{ color: textColor }}>{welcomeTitle}</h1>
            {welcomeDescription && (
              <p className="text-lg opacity-70 max-w-md">{welcomeDescription}</p>
            )}
          </div>
        )}

        {started && (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                    msg.role === 'user' ? 'text-white' : 'bg-surface-hover text-primary'
                  }`}
                  style={msg.role === 'user' ? { backgroundColor: primaryColor } : undefined}
                >
                  {msg.content || (isStreaming ? '...' : '')}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="px-6 py-4 border-t" style={{ borderColor: `${textColor}15` }}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-3 max-w-3xl mx-auto"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white text-primary"
              style={{ ['--tw-ring-color' as string]: primaryColor }}
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="px-6 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
