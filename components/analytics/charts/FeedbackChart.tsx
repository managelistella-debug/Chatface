'use client';

export function FeedbackChart({ data }: { data: { thumbs_up: number; thumbs_down: number } }) {
  const total = data.thumbs_up + data.thumbs_down;
  if (total === 0) return <p className="text-sm text-muted text-center py-8">No feedback yet</p>;

  const upPct = ((data.thumbs_up / total) * 100).toFixed(0);
  const downPct = ((data.thumbs_down / total) * 100).toFixed(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <div className="text-3xl">👍</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{data.thumbs_up}</div>
          <div className="text-xs text-muted">{upPct}%</div>
        </div>
        <div className="text-center">
          <div className="text-3xl">👎</div>
          <div className="text-2xl font-bold text-destructive mt-1">{data.thumbs_down}</div>
          <div className="text-xs text-muted">{downPct}%</div>
        </div>
      </div>
      {/* Bar */}
      <div className="h-4 flex rounded-full overflow-hidden">
        <div className="bg-green-500 transition-all" style={{ width: `${upPct}%` }} />
        <div className="bg-destructive transition-all" style={{ width: `${downPct}%` }} />
      </div>
    </div>
  );
}
