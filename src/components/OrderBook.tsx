import { useEffect, useMemo, useState } from "react";
import { fmtPrice } from "@/lib/format";

interface Level { price: number; amount: number }
interface DepthMsg {
  bids: [string, string][];
  asks: [string, string][];
}

/**
 * Real-time order book from Binance depth20@100ms stream.
 * Falls back to a synthetic ladder until first message arrives.
 */
export function OrderBook({ price, symbol }: { price: number; symbol: string }) {
  const [book, setBook] = useState<{ asks: Level[]; bids: Level[] } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pair = `${symbol.toLowerCase()}usdt`;
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: number | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair}@depth20@100ms`);
      } catch { schedule(); return; }
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data) as DepthMsg;
          if (!d.bids || !d.asks) return;
          const bids: Level[] = d.bids.slice(0, 15).map(([p, a]) => ({ price: +p, amount: +a }));
          const asks: Level[] = d.asks.slice(0, 15).map(([p, a]) => ({ price: +p, amount: +a }));
          setBook({ bids, asks });
        } catch { /* noop */ }
      };
      ws.onclose = () => { if (!closed) schedule(); };
      ws.onerror = () => { try { ws?.close(); } catch { /* noop */ } };
    };
    const schedule = () => {
      if (retry !== null) return;
      retry = window.setTimeout(() => { retry = null; connect(); }, 2500);
    };
    connect();
    return () => {
      closed = true;
      if (retry !== null) clearTimeout(retry);
      try { ws?.close(); } catch { /* noop */ }
    };
  }, [symbol]);

  const fallback = useMemo(() => {
    if (book) return null;
    const rows = 12;
    const asks: Level[] = Array.from({ length: rows }, (_, i) => ({
      price: price * (1 + 0.0005 * (rows - i)),
      amount: (Math.random() * 2 + 0.05) / (1 + i * 0.1),
    }));
    const bids: Level[] = Array.from({ length: rows }, (_, i) => ({
      price: price * (1 - 0.0005 * (i + 1)),
      amount: (Math.random() * 2 + 0.05) / (1 + i * 0.1),
    }));
    return { asks, bids };
  }, [book, price]);

  const data = book ?? fallback!;
  const asksDesc = [...data.asks].sort((a, b) => b.price - a.price).slice(-12);
  const bidsDesc = [...data.bids].sort((a, b) => b.price - a.price).slice(0, 12);
  const maxAmt = Math.max(
    ...asksDesc.map((r) => r.amount),
    ...bidsDesc.map((r) => r.amount),
    1e-9,
  );

  const bestAsk = asksDesc[asksDesc.length - 1]?.price ?? price;
  const bestBid = bidsDesc[0]?.price ?? price;
  const mid = (bestAsk + bestBid) / 2;
  const spread = bestAsk - bestBid;
  const spreadPct = (spread / mid) * 100;

  const sumBids = bidsDesc.reduce((s, r) => s + r.amount * r.price, 0);
  const sumAsks = asksDesc.reduce((s, r) => s + r.amount * r.price, 0);
  const totalDepth = sumBids + sumAsks;
  const bidPct = totalDepth > 0 ? (sumBids / totalDepth) * 100 : 50;

  return (
    <div className="bg-bg-card rounded-lg p-4 flex flex-col gap-2 h-full border border-white/5">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h3 className="text-sm font-semibold">Order Book</h3>
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${book ? "bg-success/15 text-success" : "bg-muted-foreground/15 text-muted-foreground"}`}>
          {book ? "● LIVE" : "..."}
        </span>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>Price (USDT)</span>
        <span>Amount ({symbol})</span>
        <span>Total</span>
      </div>
      <div className="space-y-px text-[11px] flex-1" dir="ltr">
        {asksDesc.map((r, i) => {
          const total = r.price * r.amount;
          return (
            <div key={`a${i}-${r.price}`} className="flex justify-between px-1 py-0.5 relative font-mono">
              <div className="absolute inset-y-0 right-0 bg-danger/15" style={{ width: `${(r.amount / maxAmt) * 100}%` }} />
              <span className="text-danger relative z-10 w-1/3">{fmtPrice(r.price)}</span>
              <span className="text-foreground/70 relative z-10 w-1/3 text-center">{r.amount.toFixed(4)}</span>
              <span className="text-muted-foreground relative z-10 w-1/3 text-right">{total.toFixed(0)}</span>
            </div>
          );
        })}
      </div>
      <div className="border-y border-white/5 my-1 py-2">
        <div className="text-base font-bold text-center text-success font-mono">{fmtPrice(mid)}</div>
        <div className="text-[10px] text-muted-foreground text-center font-mono">
          Spread {spread.toFixed(spread < 1 ? 4 : 2)} ({spreadPct.toFixed(3)}%)
        </div>
      </div>
      <div className="space-y-px text-[11px] flex-1" dir="ltr">
        {bidsDesc.map((r, i) => {
          const total = r.price * r.amount;
          return (
            <div key={`b${i}-${r.price}`} className="flex justify-between px-1 py-0.5 relative font-mono">
              <div className="absolute inset-y-0 right-0 bg-success/15" style={{ width: `${(r.amount / maxAmt) * 100}%` }} />
              <span className="text-success relative z-10 w-1/3">{fmtPrice(r.price)}</span>
              <span className="text-foreground/70 relative z-10 w-1/3 text-center">{r.amount.toFixed(4)}</span>
              <span className="text-muted-foreground relative z-10 w-1/3 text-right">{total.toFixed(0)}</span>
            </div>
          );
        })}
      </div>
      <div className="pt-2 border-t border-white/5">
        <div className="flex h-1.5 rounded overflow-hidden bg-bg-main">
          <div className="bg-success" style={{ width: `${bidPct}%` }} />
          <div className="bg-danger" style={{ width: `${100 - bidPct}%` }} />
        </div>
        <div className="flex justify-between text-[9px] font-mono mt-1">
          <span className="text-success">B {bidPct.toFixed(1)}%</span>
          <span className="text-danger">{(100 - bidPct).toFixed(1)}% S</span>
        </div>
      </div>
    </div>
  );
}
