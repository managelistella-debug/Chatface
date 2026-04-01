import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server-auth';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user || !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin top bar */}
      <div className="h-10 bg-primary flex items-center px-6 gap-3">
        <span className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">
          Admin
        </span>
        <span className="text-white/30 text-xs">·</span>
        <span className="text-xs text-white/70">
          {user.email}
        </span>
        <div className="flex-1" />
        <a href="/dashboard" className="text-xs text-white/60 hover:text-white transition-colors">
          ← Back to dashboard
        </a>
      </div>
      {children}
    </div>
  );
}
