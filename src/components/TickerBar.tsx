import { useSuspenseQuery } from "@tanstack/react-query";
import { marketsQuery } from "@/lib/coingecko";
import { fmtPrice, fmtPct } from "@/lib/format";

export function TickerBar() {
  const { data } = useSuspenseQuery(marketsQuery);
  const items = data.slice(0, 12);
  const doubled = [...items, ...items];

  return (
    <div className="bg-bg-card/50 border-b border-white/5 py-2 overflow-hidden">
      <div className="flex gap-8 px-4 animate-marquee whitespace-nowrap w-max">
        {doubled.map((c, i) => {
          const up = (c.price_change_percentage_24h ?? 0) >= 0;
          return (
            <div key={`${c.id}-${i}`} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground uppercase">{c.symbol}/USDT</span>
              <span className="font-mono">${fmtPrice(c.current_price)}</span>
              <span className={`font-mono ${up ? "text-success" : "text-danger"}`}>
                {fmtPct(c.price_change_percentage_24h)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TickerBarFallback() {
  return <div className="h-9 bg-bg-card/50 border-b border-white/5" />;
}
