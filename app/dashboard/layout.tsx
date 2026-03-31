'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { getSupabaseBrowser } from '@/lib/supabase/browser-auth';

function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then((res: { data: { user: { email?: string } | null } }) => setEmail(res.data.user?.email ?? null));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (!email) return null;

  const initials = email[0].toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 hover:bg-surface-hover rounded-lg px-2 py-1.5 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
          {initials}
        </div>
        <span className="text-xs text-primary max-w-[140px] truncate hidden sm:block">{email}</span>
        <svg className="w-3.5 h-3.5 text-muted hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-border rounded-xl shadow-lg py-1 z-50">
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-xs text-muted">Signed in as</p>
            <p className="text-xs font-medium text-primary truncate">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Agent detail pages have their own sidebar (AgentSidebar via nested layout)
  const isAgentDetailPage = /^\/dashboard\/agents\/[^/]+/.test(pathname) && pathname !== '/dashboard/agents/new';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Global top header bar */}
      <header className="flex items-center justify-between h-[57px] px-4 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">C</span>
            </div>
            <span className="text-sm font-semibold text-primary">ChatFace</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/docs" className="text-xs text-muted hover:text-primary transition-colors">Docs</Link>
          <UserMenu />
        </div>
      </header>

      {/* Below header: sidebar + content */}
      <div className="flex flex-1 overflow-hidden" suppressHydrationWarning>
        {!isAgentDetailPage && <Sidebar />}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
