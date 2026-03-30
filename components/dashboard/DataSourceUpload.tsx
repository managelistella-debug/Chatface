'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';

const UPLOAD_TABS = ['File Upload', 'Plain Text', 'URL', 'GitHub'] as const;

export function DataSourceUpload({ agentId, onUploaded }: { agentId: string; onUploaded?: () => void }) {
  const [activeTab, setActiveTab] = useState<(typeof UPLOAD_TABS)[number]>('File Upload');
  const [uploading, setUploading] = useState(false);
  const [textName, setTextName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [url, setUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [githubBranch, setGithubBranch] = useState('');
  const [githubFolder, setGithubFolder] = useState('');
  const [showTokenField, setShowTokenField] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('agent_id', agentId);

      const res = await fetch('/api/data-sources/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      toast('File uploaded and processing started', 'success');
      if (fileRef.current) fileRef.current.value = '';
      onUploaded?.();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!textName.trim() || !textContent.trim()) return;

    setUploading(true);
    try {
      const res = await fetch('/api/data-sources/create-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, name: textName.trim(), content: textContent }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      toast('Text source created and processing started', 'success');
      setTextName('');
      setTextContent('');
      onUploaded?.();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setUploading(true);
    try {
      const res = await fetch('/api/data-sources/crawl-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, url: url.trim() }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      toast('URL crawl started', 'success');
      setUrl('');
      onUploaded?.();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleGitHubSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!githubUrl.trim()) return;

    setUploading(true);
    try {
      const body: Record<string, string> = {
        agent_id: agentId,
        repo_url: githubUrl.trim(),
      };
      if (githubToken.trim()) body.token = githubToken.trim();
      if (githubBranch.trim()) body.branch = githubBranch.trim();
      if (githubFolder.trim()) body.folder_path = githubFolder.trim();

      const res = await fetch('/api/data-sources/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const fileCount = (json.data as { file_count?: number })?.file_count ?? 0;
      toast(`GitHub repo connected — indexing ${fileCount} file${fileCount !== 1 ? 's' : ''}`, 'success');
      setGithubUrl('');
      setGithubToken('');
      setGithubBranch('');
      setGithubFolder('');
      onUploaded?.();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <h3 className="font-semibold text-primary mb-4">Add Data Source</h3>

      <div className="flex gap-4 mb-4">
        {UPLOAD_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === tab ? 'bg-brand-600 text-white' : 'text-muted-foreground hover:bg-surface-hover'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'File Upload' && (
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Upload PDF, DOCX, or TXT
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
              required
            />
          </div>
          <Button type="submit" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </form>
      )}

      {activeTab === 'Plain Text' && (
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <Input
            label="Source Name"
            placeholder="e.g. FAQ Content"
            value={textName}
            onChange={(e) => setTextName(e.target.value)}
            required
          />
          <Textarea
            label="Content"
            placeholder="Paste your text content here..."
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            rows={8}
            required
          />
          <Button type="submit" disabled={uploading || !textName.trim() || !textContent.trim()}>
            {uploading ? 'Processing...' : 'Add Text'}
          </Button>
        </form>
      )}

      {activeTab === 'URL' && (
        <form onSubmit={handleUrlSubmit} className="space-y-4">
          <div className="space-y-1">
            <Input
              label="Website URL"
              placeholder="https://yourcompany.com"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted">
              Enter your website homepage to automatically crawl and index up to 50 pages.
              Use a specific page URL (e.g. <code className="font-mono">/about/team</code>) to index only that page.
            </p>
          </div>
          <Button type="submit" disabled={uploading || !url.trim()}>
            {uploading ? 'Crawling…' : 'Crawl & Index Website'}
          </Button>
        </form>
      )}

      {activeTab === 'GitHub' && (
        <form onSubmit={handleGitHubSubmit} className="space-y-4">
          {/* Repo URL */}
          <div className="space-y-1">
            <Input
              label="Repository URL"
              placeholder="https://github.com/owner/repo"
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted">
              Public repos work without a token. For private repos, add a personal access token below.
            </p>
          </div>

          {/* Optional fields row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-primary">Branch <span className="text-muted font-normal">(optional)</span></label>
              <input
                type="text"
                placeholder="main"
                value={githubBranch}
                onChange={(e) => setGithubBranch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-primary">Folder path <span className="text-muted font-normal">(optional)</span></label>
              <input
                type="text"
                placeholder="docs/"
                value={githubFolder}
                onChange={(e) => setGithubFolder(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Token toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowTokenField((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {showTokenField ? 'Hide token' : 'Add access token (private repos)'}
            </button>
            {showTokenField && (
              <div className="mt-2 space-y-1">
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
                <p className="text-xs text-muted">
                  Create a fine-grained token with read-only access to the repository at{' '}
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                    github.com/settings/tokens
                  </a>
                  . Tokens are never stored.
                </p>
              </div>
            )}
          </div>

          <Button type="submit" disabled={uploading || !githubUrl.trim()}>
            {uploading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Fetching files…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                Connect GitHub Repo
              </span>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
