'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { ToastContainer } from '@/components/ui/Toast';

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
      {/* Global top header bar — matches Chatbase's 57px full-width bar */}
      <header className="flex items-center justify-between h-[57px] px-4 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">C</span>
            </div>
            <span className="text-sm font-semibold text-primary">ChatFace</span>
          </Link>
          <span className="px-1.5 py-0.5 text-[11px] text-muted bg-surface-hover rounded-full font-medium">Trial</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/docs" className="text-xs text-muted hover:text-primary transition-colors">Docs</Link>
          <Link href="/dashboard" className="text-xs text-muted hover:text-primary transition-colors">Help</Link>
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
