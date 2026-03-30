(function() {
  var config = window.chatfaceConfig;
  if (!config || !config.agentId) {
    console.error('[ChatFace] Missing agentId in window.chatfaceConfig');
    return;
  }

  // Determine base URL
  var scripts = document.querySelectorAll('script[src]');
  var baseUrl = '';
  scripts.forEach(function(s) {
    if (s.src.includes('widget.js')) {
      baseUrl = new URL(s.src).origin;
    }
  });
  if (!baseUrl) baseUrl = window.location.origin;

  var CSS = ':host{all:initial;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.5}.cf-bubble{position:fixed;bottom:20px;width:56px;height:56px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:99999;transition:transform .2s}.cf-bubble:hover{transform:scale(1.1)}.cf-bubble.right{right:20px}.cf-bubble.left{left:20px}.cf-bubble svg{width:24px;height:24px;fill:#fff}.cf-window{position:fixed;bottom:90px;width:380px;height:520px;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 8px 30px rgba(0,0,0,.12);z-index:99999;transition:opacity .2s,transform .2s}.cf-window.right{right:20px}.cf-window.left{left:20px}.cf-window.hidden{opacity:0;transform:translateY(20px);pointer-events:none}.cf-window.light{background:#fff;color:#1a1a1a}.cf-window.dark{background:#1a1a2e;color:#e5e5e5}.cf-header{padding:14px 16px;color:#fff;font-weight:600;font-size:15px;display:flex;align-items:center;gap:10px}.cf-header-avatar{width:32px;height:32px;border-radius:50%;object-fit:cover}.cf-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}.cf-message{max-width:80%;padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;word-wrap:break-word;white-space:pre-wrap}.cf-message.user{align-self:flex-end;color:#fff}.cf-message.assistant.light{background:#f3f4f6;color:#1a1a1a;align-self:flex-start}.cf-message.assistant.dark{background:#2a2a4a;color:#e5e5e5;align-self:flex-start}.cf-suggestions{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 12px}.cf-suggestion{padding:6px 12px;border-radius:20px;border:1px solid;font-size:12px;cursor:pointer;background:0 0;transition:background .15s}.cf-attachment-preview{padding:0 16px;font-size:12px}.cf-attachment-preview.uploading{color:#6b7280;padding-bottom:6px}.cf-attachment-preview.ready{display:flex;align-items:center;gap:6px;padding-bottom:6px;color:#1a1a1a}.cf-attachment-preview.error{color:#dc2626;padding-bottom:6px}.cf-attach-name{font-size:12px}.cf-attach-remove{background:none;border:none;cursor:pointer;color:#6b7280;font-size:14px;line-height:1;padding:0 2px}.cf-input-area{padding:12px 16px;display:flex;gap:8px;align-items:center}.cf-input-area.light{border-top:1px solid #e5e7eb}.cf-input-area.dark{border-top:1px solid #333}.cf-attach-btn{cursor:pointer;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;color:#6b7280;flex-shrink:0;transition:color .15s}.cf-attach-btn:hover{color:#374151}.cf-attach-btn svg{width:18px;height:18px}.cf-input{flex:1;padding:8px 12px;border-radius:10px;border:1px solid #d1d5db;font-size:13px;outline:0;background:0 0;color:inherit}.cf-input.dark{border-color:#444}.cf-send{border:none;border-radius:10px;padding:8px 14px;color:#fff;font-size:13px;font-weight:500;cursor:pointer;flex-shrink:0}.cf-send:disabled{opacity:.5;cursor:not-allowed}.cf-branding{text-align:center;font-size:11px;padding:6px 0 8px;color:#9ca3af;border-top:1px solid #f3f4f6}.cf-branding.dark{color:#6b7280;border-top-color:#2a2a4a}.cf-proactive{position:fixed;bottom:88px;max-width:260px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:10px 14px;box-shadow:0 4px 16px rgba(0,0,0,.1);z-index:99998;cursor:pointer;display:flex;align-items:center;gap:8px;transition:opacity .25s,transform .25s;animation:cf-pop-in .25s ease}.cf-proactive.right{right:20px}.cf-proactive.left{left:20px}.cf-proactive.hidden{display:none}.cf-proactive-text{font-size:13px;line-height:1.4;color:#1a1a1a;flex:1}.cf-proactive-close{background:none;border:none;cursor:pointer;color:#9ca3af;font-size:13px;padding:0;line-height:1;flex-shrink:0}.cf-proactive-close:hover{color:#374151}@keyframes cf-pop-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';

  // Fetch agent config then initialize
  fetch(baseUrl + '/api/widget/agents/' + config.agentId)
    .then(function(r) { return r.json(); })
    .then(function(json) {
      if (!json.data) { console.error('[ChatFace] Agent not found'); return; }
      initWidget(json.data);
    })
    .catch(function(err) { console.error('[ChatFace] Init failed:', err); });

  function initWidget(agent) {
    var wc = agent.widget_config || {};
    var primaryColor = wc.primary_color || '#6366f1';
    var theme = wc.theme || 'light';
    var alignment = wc.bubble_alignment || 'right';
    var displayName = wc.display_name || agent.name || 'Chat';
    var hideBranding = wc.hide_branding || false;
    var footerText = hideBranding ? '' : (wc.footer_text || 'Powered by Chatface');
    var proactiveMsg = wc.proactive_message || '';
    var proactiveDelay = typeof wc.proactive_message_delay === 'number' ? wc.proactive_message_delay : 3;

    // Shadow DOM
    var host = document.createElement('div');
    host.id = 'chatface-widget';
    document.body.appendChild(host);
    var shadow = host.attachShadow({ mode: 'open' });

    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    shadow.appendChild(styleEl);

    var isOpen = false;
    var conversationId = null;
    var isStreaming = false;

    // Bubble
    var bubble = document.createElement('div');
    bubble.className = 'cf-bubble ' + alignment;
    bubble.style.backgroundColor = primaryColor;
    bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';

    // Chat window
    var chatWindow = document.createElement('div');
    chatWindow.className = 'cf-window ' + alignment + ' ' + theme + ' hidden';

    var headerAvatar = wc.profile_picture_url ? '<img class="cf-header-avatar" src="' + wc.profile_picture_url + '" alt="">' : '';
    var suggestionsHtml = (wc.suggested_messages && wc.suggested_messages.length) ? '<div class="cf-suggestions"></div>' : '';

    var brandingHtml = footerText
      ? '<div class="cf-branding ' + theme + '">' + footerText + '</div>'
      : '';

    chatWindow.innerHTML =
      '<div class="cf-header" style="background-color:' + primaryColor + '">' + headerAvatar + '<span>' + displayName + '</span></div>' +
      '<div class="cf-messages"></div>' +
      suggestionsHtml +
      '<div class="cf-attachment-preview"></div>' +
      '<div class="cf-input-area ' + theme + '">' +
        '<label class="cf-attach-btn" title="Attach file (PDF or image)">' +
          '<input type="file" class="cf-file-input" accept=".pdf,.txt,image/png,image/jpeg" style="display:none">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>' +
        '</label>' +
        '<input class="cf-input ' + theme + '" placeholder="Type a message...">' +
        '<button class="cf-send" style="background-color:' + primaryColor + '">Send</button>' +
      '</div>' +
      brandingHtml;

    // Proactive message bubble (shown above the chat button)
    var proactiveBubble = null;
    if (proactiveMsg) {
      proactiveBubble = document.createElement('div');
      proactiveBubble.className = 'cf-proactive ' + alignment + ' hidden';
      proactiveBubble.innerHTML =
        '<span class="cf-proactive-text">' + proactiveMsg + '</span>' +
        '<button class="cf-proactive-close" title="Dismiss">✕</button>';
    }

    shadow.appendChild(bubble);
    if (proactiveBubble) shadow.appendChild(proactiveBubble);
    shadow.appendChild(chatWindow);

    var messagesEl = chatWindow.querySelector('.cf-messages');
    var suggestionsEl = chatWindow.querySelector('.cf-suggestions');
    var attachPreviewEl = chatWindow.querySelector('.cf-attachment-preview');
    var fileInputEl = chatWindow.querySelector('.cf-file-input');
    var inputEl = chatWindow.querySelector('.cf-input');
    var sendBtn = chatWindow.querySelector('.cf-send');
    var pendingAttachment = null; // { type, name, content, mime_type }

    fileInputEl.onchange = function() {
      var file = fileInputEl.files[0];
      if (!file) return;

      var formData = new FormData();
      formData.append('file', file);

      attachPreviewEl.textContent = 'Uploading ' + file.name + '…';
      attachPreviewEl.className = 'cf-attachment-preview uploading';

      fetch(baseUrl + '/api/widget/upload', { method: 'POST', body: formData })
        .then(function(r) { return r.json(); })
        .then(function(json) {
          if (json.data) {
            pendingAttachment = json.data;
            attachPreviewEl.innerHTML = '<span class="cf-attach-name">📎 ' + file.name + '</span><button class="cf-attach-remove" title="Remove">✕</button>';
            attachPreviewEl.className = 'cf-attachment-preview ready';
            attachPreviewEl.querySelector('.cf-attach-remove').onclick = function() {
              pendingAttachment = null;
              attachPreviewEl.textContent = '';
              attachPreviewEl.className = 'cf-attachment-preview';
              fileInputEl.value = '';
            };
          } else {
            attachPreviewEl.textContent = 'Upload failed';
            attachPreviewEl.className = 'cf-attachment-preview error';
          }
        })
        .catch(function() {
          attachPreviewEl.textContent = 'Upload failed';
          attachPreviewEl.className = 'cf-attachment-preview error';
        });

      fileInputEl.value = '';
    };

    if (wc.initial_message) addMessage('assistant', wc.initial_message);

    if (suggestionsEl && wc.suggested_messages) {
      wc.suggested_messages.forEach(function(msg) {
        var btn = document.createElement('button');
        btn.className = 'cf-suggestion';
        btn.style.borderColor = primaryColor;
        btn.style.color = primaryColor;
        btn.textContent = msg;
        btn.onclick = function() { sendMessage(msg); };
        suggestionsEl.appendChild(btn);
      });
    }

    bubble.onclick = function() {
      isOpen = !isOpen;
      if (isOpen) {
        chatWindow.classList.remove('hidden');
        // Hide proactive bubble when chat opens
        if (proactiveBubble) proactiveBubble.classList.add('hidden');
      } else {
        chatWindow.classList.add('hidden');
      }
      if (isOpen) inputEl.focus();
    };

    // Proactive message: show after delay, clicking it opens chat
    if (proactiveBubble) {
      setTimeout(function() {
        if (!isOpen) proactiveBubble.classList.remove('hidden');
      }, proactiveDelay * 1000);

      proactiveBubble.querySelector('.cf-proactive-text').onclick = function() {
        proactiveBubble.classList.add('hidden');
        isOpen = true;
        chatWindow.classList.remove('hidden');
        inputEl.focus();
      };

      proactiveBubble.querySelector('.cf-proactive-close').onclick = function(e) {
        e.stopPropagation();
        proactiveBubble.classList.add('hidden');
      };
    }

    sendBtn.onclick = function() {
      var text = inputEl.value.trim();
      if (text && !isStreaming) sendMessage(text);
    };

    inputEl.onkeydown = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        var text = inputEl.value.trim();
        if (text && !isStreaming) sendMessage(text);
      }
    };

    function addMessage(role, content) {
      var el = document.createElement('div');
      el.className = 'cf-message ' + role + (role === 'assistant' ? ' ' + theme : '');
      if (role === 'user') el.style.backgroundColor = primaryColor;
      el.textContent = content;
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return el;
    }

    function sendMessage(text) {
      inputEl.value = '';
      if (suggestionsEl) suggestionsEl.remove();
      suggestionsEl = null;

      var attachment = pendingAttachment;
      pendingAttachment = null;
      attachPreviewEl.textContent = '';
      attachPreviewEl.className = 'cf-attachment-preview';

      var displayText = attachment ? text + ' 📎 ' + attachment.name : text;
      addMessage('user', displayText);
      var assistantEl = addMessage('assistant', '...');
      isStreaming = true;
      sendBtn.disabled = true;

      var fullContent = '';
      var payload = {
        agent_id: config.agentId,
        message: text,
        conversation_id: conversationId,
        user_identifier: config.userIdentifier || undefined,
        attachments: attachment ? [attachment] : []
      };

      fetch(baseUrl + '/api/widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function(res) {
        var reader = res.body.getReader();
        var decoder = new TextDecoder();

        function read() {
          return reader.read().then(function(result) {
            if (result.done) {
              isStreaming = false;
              sendBtn.disabled = false;
              inputEl.focus();
              return;
            }

            var chunk = decoder.decode(result.value, { stream: true });
            var lines = chunk.split('\n');
            for (var i = 0; i < lines.length; i++) {
              if (lines[i].indexOf('data: ') !== 0) continue;
              try {
                var parsed = JSON.parse(lines[i].slice(6));
                if (parsed.type === 'text') {
                  fullContent += parsed.content;
                  assistantEl.textContent = fullContent;
                  messagesEl.scrollTop = messagesEl.scrollHeight;
                } else if (parsed.type === 'done' && parsed.conversation_id) {
                  conversationId = parsed.conversation_id;
                }
              } catch(e) {}
            }

            return read();
          });
        }

        return read();
      }).catch(function() {
        assistantEl.textContent = 'Sorry, something went wrong.';
        isStreaming = false;
        sendBtn.disabled = false;
      });
    }
  }
})();
