import { useMemo } from "react";
import { fmtPrice } from "@/lib/format";

// Synthetic order book based on current price (for paper trading demo)
export function OrderBook({ price, symbol }: { price: number; symbol: string }) {
  const { asks, bids } = useMemo(() => {
    const rows = 12;
    const tickPct = 0.0005; // 0.05% per row
    const asks = Array.from({ length: rows }, (_, i) => {
      const p = price * (1 + tickPct * (rows - i));
      const amt = (Math.random() * 2 + 0.05) / (1 + i * 0.1);
      return { price: p, amount: amt };
    });
    const bids = Array.from({ length: rows }, (_, i) => {
      const p = price * (1 - tickPct * (i + 1));
      const amt = (Math.random() * 2 + 0.05) / (1 + i * 0.1);
      return { price: p, amount: amt };
    });
    const maxAmt = Math.max(...asks.map((r) => r.amount), ...bids.map((r) => r.amount));
    return { asks: asks.map(r => ({...r, depth: (r.amount / maxAmt) * 100})), bids: bids.map(r => ({...r, depth: (r.amount / maxAmt) * 100})) };
  }, [price]);

  return (
    <div className="bg-bg-card rounded-lg p-4 flex flex-col gap-2 h-full">
      <h3 className="text-sm font-semibold border-b border-white/5 pb-2 mb-1">Order Book</h3>
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>Price (USDT)</span>
        <span>Amount ({symbol})</span>
      </div>
      <div className="space-y-px text-[11px]" dir="ltr">
        {asks.map((r, i) => (
          <div key={`a${i}`} className="flex justify-between px-1 py-0.5 relative font-mono">
            <div className="absolute inset-y-0 right-0 bg-danger/10" style={{ width: `${r.depth}%` }} />
            <span className="text-danger relative z-10">{fmtPrice(r.price)}</span>
            <span className="text-foreground/70 relative z-10">{r.amount.toFixed(4)}</span>
          </div>
        ))}
      </div>
      <div className="text-base font-bold text-center py-2 text-success font-mono border-y border-white/5 my-1">
        {fmtPrice(price)}
      </div>
      <div className="space-y-px text-[11px]" dir="ltr">
        {bids.map((r, i) => (
          <div key={`b${i}`} className="flex justify-between px-1 py-0.5 relative font-mono">
            <div className="absolute inset-y-0 right-0 bg-success/10" style={{ width: `${r.depth}%` }} />
            <span className="text-success relative z-10">{fmtPrice(r.price)}</span>
            <span className="text-foreground/70 relative z-10">{r.amount.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
