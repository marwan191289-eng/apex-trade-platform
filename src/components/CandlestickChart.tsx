import { useMemo } from "react";
import type { OHLC } from "@/lib/coingecko";

interface Props {
  data: OHLC[];
  height?: number;
}

export function CandlestickChart({ data, height = 420 }: Props) {
  const { paths, ymin, ymax, latest } = useMemo(() => {
    if (!data?.length) return { paths: [] as any[], ymin: 0, ymax: 0, latest: null as OHLC | null };
    const highs = data.map((d) => d.high);
    const lows = data.map((d) => d.low);
    const ymax = Math.max(...highs);
    const ymin = Math.min(...lows);
    return { paths: data, ymin, ymax, latest: data[data.length - 1] };
  }, [data]);

  if (!data?.length) {
    return (
      <div style={{ height }} className="bg-bg-main/50 rounded grid place-items-center border border-white/5">
        <span className="text-xs text-muted-foreground">Loading chart…</span>
      </div>
    );
  }

  const width = 1000;
  const padTop = 20;
  const padBot = 30;
  const usableH = height - padTop - padBot;
  const range = ymax - ymin || 1;
  const cw = width / paths.length;
  const bodyW = Math.max(2, cw * 0.65);

  const y = (v: number) => padTop + (1 - (v - ymin) / range) * usableH;

  // y-axis ticks
  const ticks = 5;
  const tickVals = Array.from({ length: ticks }, (_, i) => ymin + (range * (ticks - 1 - i)) / (ticks - 1));

  return (
    <div className="bg-bg-main/40 rounded border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-white/5">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">O</span><span className="font-mono">{latest?.open.toFixed(2)}</span>
          <span className="text-muted-foreground">H</span><span className="font-mono text-success">{latest?.high.toFixed(2)}</span>
          <span className="text-muted-foreground">L</span><span className="font-mono text-danger">{latest?.low.toFixed(2)}</span>
          <span className="text-muted-foreground">C</span><span className="font-mono">{latest?.close.toFixed(2)}</span>
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-success animate-pulse-dot" /> LIVE
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full block" preserveAspectRatio="none" style={{ height }}>
        {tickVals.map((v) => (
          <g key={v}>
            <line x1={0} x2={width} y1={y(v)} y2={y(v)} stroke="oklch(1 0 0 / 0.04)" strokeDasharray="2 4" />
            <text x={width - 6} y={y(v) - 2} textAnchor="end" fontSize="10" fill="oklch(0.65 0.015 250)" fontFamily="monospace">
              {v.toFixed(2)}
            </text>
          </g>
        ))}
        {paths.map((c, i) => {
          const up = c.close >= c.open;
          const color = up ? "var(--success)" : "var(--danger)";
          const cx = i * cw + cw / 2;
          const yo = y(c.open);
          const yc = y(c.close);
          const yh = y(c.high);
          const yl = y(c.low);
          const top = Math.min(yo, yc);
          const h = Math.max(1, Math.abs(yc - yo));
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={yh} y2={yl} stroke={color} strokeWidth="1" />
              <rect x={cx - bodyW / 2} y={top} width={bodyW} height={h} fill={color} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
