'use client';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

/**
 * Tiny per-subject grade sparkline.
 * Renders the student's last N exam scores in one subject as a small
 * line chart with the latest value highlighted. Used on report cards.
 */
export function GradeTrendSparkline({
  values,
  accent = '#4f46e5',
  height = 36,
  width = 80,
}: {
  /** Percent scores (0–100), oldest first. */
  values: number[];
  accent?: string;
  height?: number;
  width?: number;
}) {
  if (!values || values.length < 2) {
    return (
      <span className="text-xs text-[var(--color-text-subtle)] tabular-nums">
        {values?.[0] ?? '—'}{values?.[0] != null ? '%' : ''}
      </span>
    );
  }
  const data = values.map((v, i) => ({ i, v }));
  const latest = values[values.length - 1];
  const previous = values[values.length - 2];
  const delta = latest - previous;
  const deltaSign = delta > 0 ? '+' : '';
  const deltaColor =
    delta > 0 ? 'var(--color-success)' :
    delta < 0 ? 'var(--color-danger)' :
    'var(--color-text-muted)';

  return (
    <div className="inline-flex items-center gap-2 align-middle">
      <div style={{ width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              contentStyle={{
                background: 'rgba(255,255,255,0.96)',
                border: '1px solid rgba(15,23,42,0.08)',
                borderRadius: 8,
                fontSize: 11,
                padding: '4px 8px',
              }}
              labelFormatter={() => ''}
              formatter={(v) => [`${Math.round(Number(v ?? 0))}%`, '']}
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke={accent}
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col items-start">
        <span className="text-sm font-bold tabular-nums leading-none">{Math.round(latest)}%</span>
        {delta !== 0 && (
          <span className="text-[10px] font-semibold tabular-nums leading-none mt-0.5" style={{ color: deltaColor }}>
            {deltaSign}{Math.round(delta)}
          </span>
        )}
      </div>
    </div>
  );
}
