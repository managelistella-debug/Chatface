'use client';

import { useState } from 'react';
import { WidgetConfig } from '@/lib/types/database';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

interface EmbedTabProps {
  config: WidgetConfig;
  agentId: string;
  onUpdate: (field: keyof WidgetConfig, value: unknown) => void;
}

export function EmbedTab({ config, agentId, onUpdate }: EmbedTabProps) {
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const shareUrl = `${appUrl}/chat/${agentId}`;
  const embedType = config.embed_type || 'widget';

  const widgetCode = `<script>
  window.chatfaceConfig = { agentId: "${agentId}" };
</script>
<script src="${appUrl}/widget.js" defer></script>`;

  const iframeCode = `<iframe
  src="${appUrl}/help/${agentId}"
  style="width:400px;height:600px;border:none;border-radius:12px;"
  allow="microphone"
></iframe>`;

  function copy(code: string, type: 'widget' | 'iframe' | 'share') {
    navigator.clipboard.writeText(code);
    if (type === 'widget') { setCopiedWidget(true); setTimeout(() => setCopiedWidget(false), 2000); }
    else if (type === 'iframe') { setCopiedIframe(true); setTimeout(() => setCopiedIframe(false), 2000); }
    else { setCopiedShare(true); setTimeout(() => setCopiedShare(false), 2000); }
  }

  return (
    <div className="space-y-6">
      {/* Shareable test link */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h4 className="text-sm font-semibold text-primary">Shareable Link</h4>
            <p className="text-xs text-muted mt-0.5">
              A public full-screen chat page — share with teammates to test, or use as a standalone chat link.
            </p>
          </div>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 border border-brand-300 rounded-lg px-2.5 py-1.5 bg-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open
          </a>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-white border border-brand-200 rounded-lg px-3 py-2 text-primary truncate font-mono">
            {shareUrl}
          </code>
          <button
            onClick={() => copy(shareUrl, 'share')}
            className="shrink-0 text-xs font-medium px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            {copiedShare ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Embed Type */}
      <div>
        <label className="block text-sm font-medium text-primary mb-2">Embed Type</label>
        <div className="flex gap-3">
          {(['widget', 'iframe'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onUpdate('embed_type', t)}
              className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                embedType === t
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-border text-muted-foreground hover:bg-surface-hover'
              }`}
            >
              <div className="font-semibold">{t === 'widget' ? 'Chat Widget' : 'Iframe'}</div>
              <div className="text-xs mt-1 font-normal">
                {t === 'widget' ? 'Floating bubble with full features (recommended)' : 'Embed inline, simpler layout'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Allowed Domains */}
      <Textarea
        label="Allowed Domains (one per line, empty = allow all)"
        placeholder="example.com&#10;www.mysite.com"
        value={(config.allowed_domains || []).join('\n')}
        onChange={(e) => onUpdate('allowed_domains', e.target.value.split('\n').filter(Boolean))}
        rows={3}
      />

      {/* Widget Code */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-primary">
            {embedType === 'widget' ? 'Widget Embed Code' : 'Iframe Embed Code'}
          </label>
          <Button variant="secondary" size="sm" onClick={() => copy(embedType === 'widget' ? widgetCode : iframeCode, embedType)}>
            {(embedType === 'widget' ? copiedWidget : copiedIframe) ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <pre className="bg-primary text-green-400 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
          {embedType === 'widget' ? widgetCode : iframeCode}
        </pre>
      </div>

      {/* Show both if they want the other option too */}
      {embedType === 'widget' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-muted">Alternative: Iframe Code</label>
            <Button variant="ghost" size="sm" onClick={() => copy(iframeCode, 'iframe')}>
              {copiedIframe ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <pre className="bg-primary text-muted text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
            {iframeCode}
          </pre>
        </div>
      )}
    </div>
  );
}
