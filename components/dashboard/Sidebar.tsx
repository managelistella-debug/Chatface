'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    label: 'Agents',
    href: '/dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16h6M21 12c0 4.97-4.03 9-9 9a9.003 9.003 0 01-8.354-5.646L3 12a9 9 0 1118 0z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside data-sidebar="main" className="flex flex-col h-full w-[240px] border-r border-border bg-white shrink-0">
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href === '/dashboard' && pathname.startsWith('/dashboard/agents'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-surface-active text-primary'
                  : 'text-muted hover:bg-surface-hover hover:text-primary'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom - Credits */}
      <div className="border-t border-border px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted font-medium">Credits</span>
          <span className="text-xs text-muted-foreground">Trial Plan</span>
        </div>
        <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: '15%' }} />
        </div>
      </div>
    </aside>
  );
}
