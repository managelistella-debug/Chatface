'use client';

import { useEffect, useState } from 'react';
import { HelpPage } from '@/lib/types/database';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';

export function HelpPageConfig({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [helpPage, setHelpPage] = useState<HelpPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [slug, setSlug] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [welcomeTitle, setWelcomeTitle] = useState('How can we help?');
  const [welcomeDescription, setWelcomeDescription] = useState('');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#1a1a1a');

  useEffect(() => {
    fetch(`/api/help-pages?agent_id=${agentId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setHelpPage(j.data);
          setSlug(j.data.slug);
          setIsPublished(j.data.is_published);
          const cfg = j.data.config || {};
          setWelcomeTitle(cfg.welcome_title || 'How can we help?');
          setWelcomeDescription(cfg.welcome_description || '');
          setBgColor(cfg.background_color || '#ffffff');
          setTextColor(cfg.text_color || '#1a1a1a');
        } else {
          // Auto-generate slug from agent name
          setSlug(agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-'));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [agentId, agentName]);

  async function handleSave() {
    setSaving(true);
    try {
      const config = { welcome_title: welcomeTitle, welcome_description: welcomeDescription, background_color: bgColor, text_color: textColor };

      if (helpPage) {
        const res = await fetch(`/api/help-pages/${helpPage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, is_published: isPublished, config }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setHelpPage(json.data);
      } else {
        const res = await fetch('/api/help-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agentId, slug, config }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setHelpPage(json.data);
      }
      toast('Help page saved', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const pageUrl = `${appUrl}/help/${slug}`;

  if (loading) return <div className="text-sm text-muted">Loading...</div>;

  return (
    <div className="bg-white rounded-xl border border-border p-6 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-primary">Help Page</h3>
        {helpPage && (
          <Badge variant={isPublished ? 'success' : 'default'}>
            {isPublished ? 'Published' : 'Draft'}
          </Badge>
        )}
      </div>

      <Input label="URL Slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />

      {helpPage && (
        <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
          <span className="text-sm text-muted-foreground flex-1 truncate">{pageUrl}</span>
          <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(pageUrl)}>Copy</Button>
          {isPublished && (
            <a href={pageUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">Preview</Button>
            </a>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-primary">Published</label>
        <button
          onClick={() => setIsPublished(!isPublished)}
          className={`relative w-10 h-5 rounded-full transition-colors ${isPublished ? 'bg-brand-600' : 'bg-muted'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublished ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      <Input label="Welcome Title" value={welcomeTitle} onChange={(e) => setWelcomeTitle(e.target.value)} />
      <Textarea label="Welcome Description" value={welcomeDescription} onChange={(e) => setWelcomeDescription(e.target.value)} rows={3} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Background Color</label>
          <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-10 w-20 rounded border border-border cursor-pointer" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Text Color</label>
          <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-10 w-20 rounded border border-border cursor-pointer" />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving || !slug.trim()}>
        {saving ? 'Saving...' : helpPage ? 'Update Help Page' : 'Create Help Page'}
      </Button>
    </div>
  );
}
