'use client';

export function SentimentChart({ data }: { data: { positive: number; neutral: number; negative: number } }) {
  const total = data.positive + data.neutral + data.negative;
  if (total === 0) return <p className="text-sm text-muted text-center py-8">No data yet</p>;

  const segments = [
    { label: 'Positive', count: data.positive, pct: ((data.positive / total) * 100).toFixed(0), color: 'bg-green-500' },
    { label: 'Neutral', count: data.neutral, pct: ((data.neutral / total) * 100).toFixed(0), color: 'bg-muted' },
    { label: 'Negative', count: data.negative, pct: ((data.negative / total) * 100).toFixed(0), color: 'bg-destructive' },
  ];

  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div className="h-6 flex rounded-full overflow-hidden">
        {segments.map((s) => (
          s.count > 0 && (
            <div
              key={s.label}
              className={`${s.color} transition-all`}
              style={{ width: `${(s.count / total) * 100}%` }}
            />
          )
        ))}
      </div>
      {/* Legend */}
      <div className="space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
              <span className="text-primary">{s.label}</span>
            </div>
            <span className="text-muted">{s.pct}% ({s.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
