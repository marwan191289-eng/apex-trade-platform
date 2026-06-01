interface Props {
  data: number[];
  positive?: boolean;
  width?: number;
  height?: number;
}

export function Sparkline({ data, positive = true, width = 120, height = 36 }: Props) {
  if (!data?.length) return <div style={{ width, height }} className="bg-white/5 rounded" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`).join(" ");
  const color = positive ? "var(--success)" : "var(--danger)";

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`g-${positive ? "u" : "d"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
      <polygon fill={`url(#g-${positive ? "u" : "d"})`} points={`0,${height} ${points} ${width},${height}`} />
    </svg>
  );
}
