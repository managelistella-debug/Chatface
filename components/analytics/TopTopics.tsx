'use client';

export function TopTopics({ data }: { data: { topic: string; count: number }[] }) {
  if (!data.length) return <p className="text-sm text-muted text-center py-8">No topics yet</p>;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((d) => (
        <div key={d.topic}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-primary truncate max-w-[70%]">{d.topic}</span>
            <span className="text-muted text-xs">{d.count}</span>
          </div>
          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${(d.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
