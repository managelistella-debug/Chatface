'use client';

export function ConversationChart({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return <p className="text-sm text-muted text-center py-8">No data yet</p>;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1 h-48">
      {data.map((d) => {
        const height = (d.count / maxCount) * 100;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end group relative">
            <div
              className="w-full bg-brand-600 rounded-t transition-all hover:bg-brand-700 min-h-[2px]"
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            <div className="absolute -top-8 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {d.count} · {new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
