'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';

type SourceType = 'website' | 'file' | 'text' | 'skip';

interface Step1Data { name: string }
interface Step2Data { sourceType: SourceType; url: string; textName: string; textContent: string; file: File | null }

const STEPS = ['Name', 'Data Source', 'Creating'];

/* ─── Step indicator ─────────────────────────────────────────── */
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 ${i < current ? 'opacity-100' : i === current ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              i < current ? 'bg-green-500 text-white' : i === current ? 'bg-primary text-white' : 'bg-surface-hover text-muted'
            }`}>
              {i < current ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            <span className={`text-sm font-medium ${i === current ? 'text-primary' : 'text-muted'}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div className="w-10 h-px bg-border" />}
        </div>
      ))}
    </div>
  );
}

/* ─── Step 1: Agent name ─────────────────────────────────────── */
function Step1({ onNext }: { onNext: (d: Step1Data) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary mb-1">Name your AI agent</h2>
        <p className="text-sm text-muted">Give it a name your team and visitors will recognise.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-1.5">Agent name</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onNext({ name: name.trim() }); }}
          placeholder="e.g. Customer Support Bot"
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <button
        onClick={() => name.trim() && onNext({ name: name.trim() })}
        disabled={!name.trim()}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Continue
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </button>
    </div>
  );
}

/* ─── Step 2: Data source ────────────────────────────────────── */
function Step2({ agentName, onNext, onBack }: { agentName: string; onNext: (d: Step2Data) => void; onBack: () => void }) {
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [url, setUrl] = useState('');
  const [textName, setTextName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const SOURCE_OPTIONS: { type: SourceType; icon: React.ReactNode; label: string; desc: string }[] = [
    {
      type: 'website',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253" />
        </svg>
      ),
      label: 'Website URL',
      desc: 'Crawl your website and index all pages automatically',
    },
    {
      type: 'file',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
      label: 'Upload File',
      desc: 'PDF, DOCX, or TXT — up to 10 MB',
    },
    {
      type: 'text',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      ),
      label: 'Plain Text',
      desc: 'Paste FAQs, policies, product descriptions',
    },
    {
      type: 'skip',
      icon: (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z" />
        </svg>
      ),
      label: 'Skip for now',
      desc: 'Add data sources later from the dashboard',
    },
  ];

  function canContinue() {
    if (!sourceType) return false;
    if (sourceType === 'website') return url.trim().length > 0;
    if (sourceType === 'file') return file !== null;
    if (sourceType === 'text') return textName.trim().length > 0 && textContent.trim().length > 0;
    return true; // skip
  }

  function handleContinue() {
    if (!sourceType || !canContinue()) return;
    onNext({ sourceType, url, textName, textContent, file });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary mb-1">How should <span className="text-brand-600">{agentName}</span> learn?</h2>
        <p className="text-sm text-muted">Add a data source now so your agent answers questions about your business right away.</p>
      </div>

      {/* Source type cards */}
      <div className="grid grid-cols-2 gap-3">
        {SOURCE_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            onClick={() => setSourceType(opt.type)}
            className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
              sourceType === opt.type
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-brand-300 bg-white'
            }`}
          >
            <div className={`${sourceType === opt.type ? 'text-primary' : 'text-muted'}`}>{opt.icon}</div>
            <div>
              <p className={`text-sm font-semibold ${sourceType === opt.type ? 'text-primary' : 'text-primary'}`}>{opt.label}</p>
              <p className="text-xs text-muted mt-0.5 leading-snug">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Source-specific input */}
      {sourceType === 'website' && (
        <div className="space-y-1.5 p-4 bg-surface rounded-xl border border-border">
          <label className="block text-sm font-medium text-primary">Website URL</label>
          <input
            autoFocus
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canContinue()) handleContinue(); }}
            placeholder="https://yourcompany.com"
            className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-muted">
            We'll crawl your homepage and follow links to index up to 25 pages automatically.
            To index a specific page only, paste its full URL (e.g. <span className="font-mono">/pricing</span>).
          </p>
        </div>
      )}

      {sourceType === 'file' && (
        <div
          className="p-6 border-2 border-dashed border-border rounded-xl bg-surface text-center cursor-pointer hover:border-brand-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm text-primary">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {file.name}
              <button className="text-xs text-muted hover:text-red-500 ml-1" onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
            </div>
          ) : (
            <>
              <svg className="w-8 h-8 text-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.748 10.914" />
              </svg>
              <p className="text-sm text-muted">Click to upload PDF, DOCX, or TXT</p>
            </>
          )}
        </div>
      )}

      {sourceType === 'text' && (
        <div className="space-y-3 p-4 bg-surface rounded-xl border border-border">
          <input
            autoFocus
            type="text"
            value={textName}
            onChange={(e) => setTextName(e.target.value)}
            placeholder="Source name (e.g. FAQ)"
            className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Paste your text content here..."
            rows={5}
            className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>
      )}

      {sourceType === 'skip' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          You can always add data sources later from the <strong>Sources</strong> tab in your agent dashboard.
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:bg-surface-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!canContinue()}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {sourceType === 'skip' ? 'Create agent' : 'Create agent & add source'}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3: Creating ───────────────────────────────────────── */
function Step3({ agentName, sourceType }: { agentName: string; sourceType: SourceType }) {
  const steps = [
    'Creating your agent',
    sourceType !== 'skip' ? 'Adding data source' : null,
    sourceType !== 'skip' ? 'Starting to index content' : null,
    'Almost done…',
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-8 py-4">
      <div>
        <h2 className="text-xl font-semibold text-primary mb-1">Setting up <span className="text-brand-600">{agentName}</span></h2>
        <p className="text-sm text-muted">This only takes a moment.</p>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin shrink-0" style={{ animationDelay: `${i * 0.15}s` }} />
            <span className="text-sm text-primary">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main wizard ────────────────────────────────────────────── */
export function NewAgentWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [agentName, setAgentName] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('skip');

  async function handleStep2(data: Step2Data) {
    setSourceType(data.sourceType);
    setStep(2);

    try {
      // 1. Create the agent
      const agentRes = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agentName }),
      });
      const agentJson = await agentRes.json();
      if (agentJson.error) throw new Error(agentJson.error);
      const agentId: string = agentJson.data.id;

      // 2. Add data source if chosen
      if (data.sourceType === 'website' && data.url.trim()) {
        await fetch('/api/data-sources/crawl-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agentId, url: data.url.trim() }),
        });
      } else if (data.sourceType === 'file' && data.file) {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('agent_id', agentId);
        await fetch('/api/data-sources/upload', { method: 'POST', body: formData });
      } else if (data.sourceType === 'text' && data.textContent.trim()) {
        await fetch('/api/data-sources/create-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agentId, name: data.textName.trim(), content: data.textContent }),
        });
      }

      // 3. Redirect to agent dashboard
      await new Promise((r) => setTimeout(r, 800)); // brief pause so step 3 is visible
      router.push(`/dashboard/agents/${agentId}/sources`);
      router.refresh();
    } catch (err) {
      toast((err as Error).message, 'error');
      setStep(1); // go back to step 2 on error
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-xl">
        {/* Logo / back link */}
        <div className="mb-8 flex items-center gap-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to agents
          </button>
        </div>

        <StepBar current={step} />

        <div className="bg-white rounded-2xl border border-border p-8 shadow-sm">
          {step === 0 && (
            <Step1
              onNext={(d) => {
                setAgentName(d.name);
                setStep(1);
              }}
            />
          )}
          {step === 1 && (
            <Step2
              agentName={agentName}
              onNext={handleStep2}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && <Step3 agentName={agentName} sourceType={sourceType} />}
        </div>
      </div>
    </div>
  );
}
