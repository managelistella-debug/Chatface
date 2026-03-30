'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function EmbedCode({ agentId }: { agentId: string }) {
  const [copied, setCopied] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const embedCode = `<script>
  window.chatfaceConfig = { agentId: "${agentId}" };
</script>
<script src="${appUrl}/widget.js" defer></script>`;

  function handleCopy() {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-primary">Embed Code</h3>
        <Button variant="secondary" size="sm" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <pre className="bg-primary text-green-400 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
        {embedCode}
      </pre>
    </div>
  );
}
