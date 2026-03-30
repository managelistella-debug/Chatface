'use client';

import { use, useState, useEffect, useCallback } from 'react';

interface Contact {
  id: string;
  user_identifier: string;
  name?: string;
  email?: string;
  first_seen_at: string;
  last_seen_at: string;
  conversation_count: number;
  message_count: number;
}

interface ContactConversation {
  id: string;
  title: string;
  created_at: string;
  sentiment?: string;
  is_human_takeover: boolean;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ContactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = use(params);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);
  const [conversations, setConversations] = useState<ContactConversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  const fetchContacts = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/contacts?search=${encodeURIComponent(q)}&limit=50`);
      const json = await res.json();
      setContacts(json.data?.contacts || []);
      setTotal(json.data?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  useEffect(() => {
    const timer = setTimeout(() => fetchContacts(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchContacts]);

  async function selectContact(contact: Contact) {
    setSelected(contact);
    setLoadingConvs(true);
    try {
      const res = await fetch(
        `/api/agents/${agentId}/contacts/${encodeURIComponent(contact.user_identifier)}`
      );
      const json = await res.json();
      setConversations(json.data?.conversations || []);
    } finally {
      setLoadingConvs(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* Contact list */}
      <div className="flex flex-col w-[340px] border-r border-border shrink-0 h-full">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <h1 className="text-xl font-semibold text-primary mb-3">Contacts</h1>
          <input
            type="text"
            placeholder="Search by ID, name, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          />
          {!loading && (
            <p className="text-xs text-muted mt-2">{total} contact{total !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6 gap-2">
              <p className="text-2xl">👤</p>
              <p className="text-sm font-medium text-primary">No contacts yet</p>
              <p className="text-xs text-muted">
                Contacts appear when users chat with a <code className="text-[11px] bg-surface-hover px-1 rounded">userIdentifier</code> set in your widget config.
              </p>
            </div>
          ) : (
            contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => selectContact(c)}
                className={`w-full text-left px-5 py-3.5 transition-colors ${
                  selected?.id === c.id
                    ? 'bg-brand-50 border-l-2 border-l-brand-600'
                    : 'hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-brand-600">
                      {(c.name || c.email || c.user_identifier).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">
                      {c.name || c.email || c.user_identifier}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {c.conversation_count} convo{c.conversation_count !== 1 ? 's' : ''} · Last seen {timeAgo(c.last_seen_at)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Contact detail */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <p className="text-3xl">👤</p>
            <p className="text-sm text-muted">Select a contact to view their history</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Contact header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-brand-600">
                  {(selected.name || selected.email || selected.user_identifier).charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary">
                  {selected.name || selected.email || selected.user_identifier}
                </h2>
                <p className="text-sm text-muted">{selected.user_identifier}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Conversations', value: selected.conversation_count },
                { label: 'First seen', value: timeAgo(selected.first_seen_at) },
                { label: 'Last seen', value: timeAgo(selected.last_seen_at) },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-border rounded-xl p-4">
                  <p className="text-xs text-muted mb-1">{stat.label}</p>
                  <p className="text-sm font-semibold text-primary">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Conversations */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Conversations</h3>
              {loadingConvs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-muted">No conversations found.</p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="bg-white border border-border rounded-xl px-4 py-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-primary truncate max-w-xs">{conv.title}</p>
                        <p className="text-xs text-muted mt-0.5">{timeAgo(conv.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {conv.sentiment && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            conv.sentiment === 'positive' ? 'bg-green-50 text-green-700' :
                            conv.sentiment === 'negative' ? 'bg-red-50 text-red-700' :
                            'bg-surface-hover text-muted'
                          }`}>
                            {conv.sentiment}
                          </span>
                        )}
                        {conv.is_human_takeover && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                            Human
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
