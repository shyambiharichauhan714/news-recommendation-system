"use client";

// Small inline charts for the dashboard KPI cards.
//
// Every series passed in is real data (daily read counts, per-recommendation
// match scores, category share) — these are deliberately unlabelled shape
// indicators, not a substitute for the Analytics page's full charts.

import { cn } from "@/lib/utils";

interface SeriesProps {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
}

function normalise(data: number[], height: number, pad = 2) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  return data.map((v) => height - pad - ((v - min) / span) * (height - pad * 2));
}

export function BarSparkline({ data, className, width = 68, height = 34 }: SeriesProps) {
  if (!data.length) return null;
  const gap = 2;
  const barW = Math.max(2, (width - gap * (data.length - 1)) / data.length);
  const max = Math.max(...data, 1);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      {data.map((v, i) => {
        const h = Math.max(2, (v / max) * (height - 2));
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={height - h}
            width={barW}
            height={h}
            rx={1.5}
            className="fill-brand-500"
            opacity={0.35 + (0.65 * (i + 1)) / data.length}
          />
        );
      })}
    </svg>
  );
}

export function LineSparkline({ data, className, width = 68, height = 34 }: SeriesProps) {
  if (data.length < 2) return null;
  const ys = normalise(data, height);
  const step = width / (data.length - 1);
  const d = ys.map((y, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <path d={d} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="stroke-violet-500" />
    </svg>
  );
}

export function AreaSparkline({ data, className, width = 68, height = 34 }: SeriesProps) {
  if (data.length < 2) return null;
  const ys = normalise(data, height);
  const step = width / (data.length - 1);
  const line = ys.map((y, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const gid = `spark-area-${data.length}-${Math.round(data[0])}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(245 158 11)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(245 158 11)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="stroke-amber-500" />
    </svg>
  );
}

/** Donut used for "share of reads" — shows a percentage inside the ring. */
export function RingChart({
  percent,
  size = 46,
  className,
}: {
  percent: number;
  size?: number;
  className?: string;
}) {
  const stroke = 4.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  const offset = c - (pct / 100) * c;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-surface-muted" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="stroke-emerald-500"
          fill="none"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-ink-700">
        {Math.round(pct)}%
      </span>
    </div>
  );
}
