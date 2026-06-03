import { useSuspenseQuery } from "@tanstack/react-query";
import { marketsQuery } from "@/lib/coingecko";
import { fmtPrice, fmtPct } from "@/lib/format";
import { useLivePrice } from "@/lib/live-prices";

function TickerItem({ symbol, name, price, change }: { symbol: string; name: string; price: number; change: number }) {
  const live = useLivePrice(symbol);
  const p = live?.price ?? price;
  const ch = live?.changePct ?? change;
  const up = ch >= 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground uppercase">{name}/USDT</span>
      <span className="font-mono">${fmtPrice(p)}</span>
      <span className={`font-mono ${up ? "text-success" : "text-danger"}`}>{fmtPct(ch)}</span>
    </div>
  );
}

export function TickerBar() {
  const { data } = useSuspenseQuery(marketsQuery);
  const items = data.slice(0, 12);
  const doubled = [...items, ...items];

  return (
    <div className="bg-bg-card/50 border-b border-white/5 py-2 overflow-hidden">
      <div className="flex gap-8 px-4 animate-marquee whitespace-nowrap w-max">
        {doubled.map((c, i) => (
          <TickerItem key={`${c.id}-${i}`} symbol={c.symbol} name={c.symbol} price={c.current_price} change={c.price_change_percentage_24h ?? 0} />
        ))}
      </div>
    </div>
  );
}

export function TickerBarFallback() {
  return <div className="h-9 bg-bg-card/50 border-b border-white/5" />;
}
