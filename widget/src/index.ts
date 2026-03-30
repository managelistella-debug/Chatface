import { createWidgetApi } from './api';
import styles from './styles.css';

interface ChatFaceConfig {
  agentId: string;
}

declare global {
  interface Window {
    chatfaceConfig?: ChatFaceConfig;
  }
}

(async function init() {
  const config = window.chatfaceConfig;
  if (!config?.agentId) {
    console.error('[ChatFace] Missing agentId in window.chatfaceConfig');
    return;
  }

  // Determine base URL from script src
  const scripts = document.querySelectorAll('script[src]');
  let baseUrl = '';
  scripts.forEach((s) => {
    const src = (s as HTMLScriptElement).src;
    if (src.includes('widget.js')) {
      baseUrl = new URL(src).origin;
    }
  });

  if (!baseUrl) baseUrl = window.location.origin;

  const api = createWidgetApi(baseUrl);

  // Fetch agent config
  let agentConfig: {
    name: string;
    widget_config: {
      display_name?: string;
      initial_message?: string;
      suggested_messages?: string[];
      primary_color?: string;
      theme?: 'light' | 'dark';
      bubble_alignment?: 'left' | 'right';
      profile_picture_url?: string;
    };
  };

  try {
    agentConfig = await api.getAgentConfig(config.agentId);
  } catch {
    console.error('[ChatFace] Failed to load agent config');
    return;
  }

  const wc = agentConfig.widget_config || {};
  const primaryColor = wc.primary_color || '#6366f1';
  const theme = wc.theme || 'light';
  const alignment = wc.bubble_alignment || 'right';
  const displayName = wc.display_name || agentConfig.name || 'Chat';

  // Create shadow DOM container
  const host = document.createElement('div');
  host.id = 'chatface-widget';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  // State
  let isOpen = false;
  let conversationId: string | null = null;
  let isStreaming = false;
  const messages: { role: string; content: string }[] = [];

  // Create DOM
  const bubble = document.createElement('div');
  bubble.className = `cf-bubble ${alignment}`;
  bubble.style.backgroundColor = primaryColor;
  bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;

  const chatWindow = document.createElement('div');
  chatWindow.className = `cf-window ${alignment} ${theme} hidden`;

  chatWindow.innerHTML = `
    <div class="cf-header" style="background-color:${primaryColor}">
      ${wc.profile_picture_url ? `<img class="cf-header-avatar" src="${wc.profile_picture_url}" alt="">` : ''}
      <span>${displayName}</span>
    </div>
    <div class="cf-messages"></div>
    ${wc.suggested_messages?.length ? `<div class="cf-suggestions"></div>` : ''}
    <div class="cf-input-area ${theme}">
      <input class="cf-input ${theme}" placeholder="Type a message..." />
      <button class="cf-send" style="background-color:${primaryColor}">Send</button>
    </div>
  `;

  shadow.appendChild(bubble);
  shadow.appendChild(chatWindow);

  const messagesEl = chatWindow.querySelector('.cf-messages')!;
  const suggestionsEl = chatWindow.querySelector('.cf-suggestions');
  const inputEl = chatWindow.querySelector('.cf-input') as HTMLInputElement;
  const sendBtn = chatWindow.querySelector('.cf-send') as HTMLButtonElement;

  // Add initial message
  if (wc.initial_message) {
    addMessage('assistant', wc.initial_message);
  }

  // Add suggestions
  if (suggestionsEl && wc.suggested_messages) {
    wc.suggested_messages.forEach((msg) => {
      const btn = document.createElement('button');
      btn.className = 'cf-suggestion';
      btn.style.borderColor = primaryColor;
      btn.style.color = primaryColor;
      btn.textContent = msg;
      btn.onclick = () => sendMessage(msg);
      suggestionsEl.appendChild(btn);
    });
  }

  // Toggle
  bubble.onclick = () => {
    isOpen = !isOpen;
    chatWindow.classList.toggle('hidden', !isOpen);
    if (isOpen) inputEl.focus();
  };

  // Send
  sendBtn.onclick = () => {
    const text = inputEl.value.trim();
    if (text && !isStreaming) sendMessage(text);
  };

  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = inputEl.value.trim();
      if (text && !isStreaming) sendMessage(text);
    }
  };

  function addMessage(role: string, content: string): HTMLElement {
    const el = document.createElement('div');
    el.className = `cf-message ${role} ${role === 'assistant' ? theme : ''}`;
    if (role === 'user') el.style.backgroundColor = primaryColor;
    el.textContent = content;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  async function sendMessage(text: string) {
    inputEl.value = '';
    if (suggestionsEl) suggestionsEl.remove();

    addMessage('user', text);
    messages.push({ role: 'user', content: text });

    const assistantEl = addMessage('assistant', '...');
    isStreaming = true;
    sendBtn.disabled = true;

    let fullContent = '';

    try {
      for await (const event of api.streamChat(config.agentId, text, conversationId || undefined)) {
        if (event.type === 'text') {
          fullContent += event.content;
          assistantEl.textContent = fullContent;
          messagesEl.scrollTop = messagesEl.scrollHeight;
        } else if (event.type === 'done') {
          if (event.conversation_id) conversationId = event.conversation_id;
        }
      }
      messages.push({ role: 'assistant', content: fullContent });
    } catch {
      assistantEl.textContent = 'Sorry, something went wrong. Please try again.';
    }

    isStreaming = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
})();
