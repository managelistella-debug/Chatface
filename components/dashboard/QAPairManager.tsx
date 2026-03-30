'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';
import { QAPair } from '@/lib/types/database';

interface QAPairManagerProps {
  agentId: string;
}

export function QAPairManager({ agentId }: QAPairManagerProps) {
  const [pairs, setPairs] = useState<QAPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New pair form
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  // Bulk import
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);

  const fetchPairs = useCallback(async () => {
    try {
      const res = await fetch(`/api/qa-pairs?agent_id=${agentId}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setPairs(json.data || []);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchPairs();
  }, [fetchPairs]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/qa-pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setPairs((prev) => [json.data, ...prev]);
      setNewQuestion('');
      setNewAnswer('');
      toast('Q&A pair added', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editQuestion.trim() || !editAnswer.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/qa-pairs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: editQuestion.trim(),
          answer: editAnswer.trim(),
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setPairs((prev) => prev.map((p) => (p.id === id ? json.data : p)));
      setEditingId(null);
      toast('Q&A pair updated', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/qa-pairs/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setPairs((prev) => prev.filter((p) => p.id !== id));
      toast('Q&A pair deleted', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  function startEdit(pair: QAPair) {
    setEditingId(pair.id);
    setEditQuestion(pair.question);
    setEditAnswer(pair.answer);
  }

  function parseBulkText(text: string): { question: string; answer: string }[] {
    const results: { question: string; answer: string }[] = [];
    const lines = text.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      // Try CSV format: "question","answer" or question,answer
      const csvMatch = line.match(
        /^"?([^"]*?)"?\s*,\s*"?([^"]*?)"?\s*$/
      );
      if (csvMatch && csvMatch[1].trim() && csvMatch[2].trim()) {
        results.push({ question: csvMatch[1].trim(), answer: csvMatch[2].trim() });
        continue;
      }

      // Try Q: / A: format
      const qaMatch = line.match(/^[Qq]:\s*(.+?)\s*[|/]\s*[Aa]:\s*(.+)$/);
      if (qaMatch && qaMatch[1].trim() && qaMatch[2].trim()) {
        results.push({ question: qaMatch[1].trim(), answer: qaMatch[2].trim() });
        continue;
      }

      // Try tab-separated
      const tabParts = line.split('\t');
      if (tabParts.length >= 2 && tabParts[0].trim() && tabParts[1].trim()) {
        results.push({ question: tabParts[0].trim(), answer: tabParts[1].trim() });
      }
    }

    return results;
  }

  async function handleBulkImport() {
    const parsed = parseBulkText(bulkText);
    if (parsed.length === 0) {
      toast('No valid Q&A pairs found. Use CSV, tab-separated, or Q:/A: format.', 'error');
      return;
    }

    setBulkImporting(true);
    try {
      const res = await fetch('/api/qa-pairs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, pairs: parsed }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setPairs((prev) => [...(json.data || []), ...prev]);
      setBulkText('');
      setShowBulk(false);
      toast(`Imported ${json.data.length} Q&A pairs`, 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBulkImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-hover rounded w-1/3" />
          <div className="h-20 bg-surface-hover rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add new Q&A pair */}
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-primary">Add Q&A Pair</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBulk(!showBulk)}
          >
            {showBulk ? 'Single Entry' : 'Bulk Import'}
          </Button>
        </div>

        {showBulk ? (
          <div className="space-y-4">
            <Textarea
              label="Bulk Import"
              placeholder={`Paste Q&A pairs in one of these formats:\n\nCSV: question,answer\nTab-separated: question[TAB]answer\nQ/A: Q: question | A: answer`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={handleBulkImport}
                disabled={bulkImporting || !bulkText.trim()}
              >
                {bulkImporting ? 'Importing...' : 'Import'}
              </Button>
              {bulkText.trim() && (
                <span className="text-sm text-muted">
                  {parseBulkText(bulkText).length} pairs detected
                </span>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              label="Question"
              placeholder="e.g. What are your business hours?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              required
            />
            <Textarea
              label="Answer"
              placeholder="e.g. We are open Monday through Friday, 9am to 5pm."
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              rows={3}
              required
            />
            <Button
              type="submit"
              disabled={saving || !newQuestion.trim() || !newAnswer.trim()}
            >
              {saving ? 'Adding...' : 'Add Q&A Pair'}
            </Button>
          </form>
        )}
      </div>

      {/* Existing Q&A pairs */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h3 className="font-semibold text-primary mb-4">
          Q&A Pairs {pairs.length > 0 && `(${pairs.length})`}
        </h3>

        {pairs.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted text-4xl mb-3">?</div>
            <p className="text-muted text-sm">
              No Q&A pairs yet. Add some above to give your agent predefined answers
              to common questions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pairs.map((pair) => (
              <div
                key={pair.id}
                className="border border-border rounded-lg p-4"
              >
                {editingId === pair.id ? (
                  <div className="space-y-3">
                    <Input
                      label="Question"
                      value={editQuestion}
                      onChange={(e) => setEditQuestion(e.target.value)}
                    />
                    <Textarea
                      label="Answer"
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(pair.id)}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">
                      Q: {pair.question}
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      A: {pair.answer}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(pair)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(pair.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
