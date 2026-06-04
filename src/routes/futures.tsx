import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useMemo, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CandlestickChart } from "@/components/CandlestickChart";
import { OrderBook } from "@/components/OrderBook";
import { marketsQuery } from "@/lib/coingecko";
import { fmtPrice, fmtPct } from "@/lib/format";
import { openFuturesPosition, closeFuturesPosition, listFuturesPositions } from "@/lib/futures.functions";
import { useLivePrice, useLivePrices } from "@/lib/live-prices";
import { queryOptions } from "@tanstack/react-query";

const positionsQuery = queryOptions({
  queryKey: ["futures-positions"],
  queryFn: () => listFuturesPositions(),
  staleTime: 5_000,
});

export const Route = createFileRoute("/futures")({
  head: () => ({ meta: [{ title: "Futures — TradeXray" }, { name: "description", content: "Trade perpetual crypto futures with up to 125x leverage." }] }),
  errorComponent: ({ error }) => <div className="p-8 text-danger">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: FuturesPage,
});

function FuturesPage() {
  return (
    <div className="min-h-screen bg-bg-main">
      <Header />
      <main className="max-w-[1600px] mx-auto p-4">
        <Suspense fallback={<div className="p-12 text-center text-muted-foreground">Loading…</div>}>
          <Content />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function Content() {
  const { data: coins } = useSuspenseQuery(marketsQuery);
  const [symbol, setSymbol] = useState("BTC");
  const coin = coins.find((c) => c.symbol.toUpperCase() === symbol) ?? coins[0];
  const live = useLivePrice(coin.symbol);
  const price = live?.price ?? coin.current_price;
  const changePct = live?.changePct ?? coin.price_change_percentage_24h ?? 0;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-1">Perpetual Futures</h1>
          <p className="text-muted-foreground text-sm">Open leveraged long/short positions on any major asset. Up to 125x.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-bg-card border border-white/10 rounded p-2 text-sm font-mono"
          >
            {coins.slice(0, 50).map((c) => (
              <option key={c.id} value={c.symbol.toUpperCase()}>{c.symbol.toUpperCase()}/USDT-PERP</option>
            ))}
          </select>
          <div className="text-2xl font-mono font-bold">${fmtPrice(price)}</div>
          <div className={`text-sm font-mono ${changePct >= 0 ? "text-success" : "text-danger"}`}>
            {fmtPct(changePct)}{live ? " • LIVE" : ""}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-12 lg:col-span-3 order-2 lg:order-1">
          <OrderBook price={price} symbol={symbol} />
        </div>
        <div className="col-span-12 lg:col-span-6 order-1 lg:order-2">
          <CandlestickChart symbol={symbol} />
        </div>
        <div className="col-span-12 lg:col-span-3 order-3">
          <OpenPositionForm symbol={symbol} price={price} />
        </div>
      </div>
      <div className="bg-bg-card border border-white/5 rounded-lg p-5">
        <PositionsList currentPrices={coins} />
      </div>
    </>
  );
}

function OpenPositionForm({ symbol, price }: { symbol: string; price: number }) {
  const open = useServerFn(openFuturesPosition);
  const qc = useQueryClient();
  const [side, setSide] = useState<"long" | "short">("long");
  const [margin, setMargin] = useState(100);
  const [lev, setLev] = useState(10);

  const submit = async () => {
    try {
      await open({ data: { symbol, side, margin_usdt: margin, leverage: lev, entry_price: price } });
      toast.success(`${side.toUpperCase()} ${symbol} ${lev}x opened`);
      qc.invalidateQueries({ queryKey: ["futures-positions"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const size = margin * lev;
  const liqBuffer = 0.95 / lev;
  const liq = side === "long" ? price * (1 - liqBuffer) : price * (1 + liqBuffer);

  return (
    <div className="bg-bg-card border border-white/5 rounded-lg p-5 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setSide("long")} className={`py-2 rounded font-bold text-sm ${side === "long" ? "bg-success text-bg-main" : "bg-bg-main text-muted-foreground"}`}>LONG</button>
        <button onClick={() => setSide("short")} className={`py-2 rounded font-bold text-sm ${side === "short" ? "bg-danger text-white" : "bg-bg-main text-muted-foreground"}`}>SHORT</button>
      </div>
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Leverage: {lev}x</label>
        <input type="range" min={1} max={125} value={lev} onChange={(e) => setLev(+e.target.value)} className="w-full accent-accent" />
        <div className="flex gap-1 mt-2">
          {[5, 10, 25, 50, 100, 125].map((x) => (
            <button key={x} onClick={() => setLev(x)} className={`flex-1 text-xs py-1 rounded ${lev === x ? "bg-accent text-bg-main" : "bg-bg-main text-muted-foreground"}`}>{x}x</button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">Margin (USDT)</label>
        <input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} className="w-full bg-bg-main border border-white/10 rounded p-2 text-sm font-mono" />
      </div>
      <div className="text-xs space-y-1 font-mono">
        <Row label="Position size" value={`$${size.toLocaleString()}`} />
        <Row label="Entry price" value={`$${fmtPrice(price)}`} />
        <Row label="Liquidation" value={`$${fmtPrice(liq)}`} cls="text-danger" />
      </div>
      <button onClick={submit} className={`w-full py-3 rounded font-bold ${side === "long" ? "bg-success text-bg-main" : "bg-danger text-white"} hover:brightness-110`}>
        Open {side.toUpperCase()} {lev}x
      </button>
    </div>
  );
}

function Row({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className={cls}>{value}</span></div>
  );
}

function PositionsList({ currentPrices }: { currentPrices: Array<{ symbol: string; current_price: number }> }) {
  const { data: positions } = useSuspenseQuery(positionsQuery);
  const close = useServerFn(closeFuturesPosition);
  const qc = useQueryClient();
  const priceMap = useMemo(() => new Map(currentPrices.map((c) => [c.symbol.toUpperCase(), c.current_price])), [currentPrices]);

  const open = positions.filter((p) => p.status === "open");
  const closed = positions.filter((p) => p.status !== "open");

  const onClose = async (id: string, symbol: string) => {
    const exit = priceMap.get(symbol) ?? 0;
    try {
      const r = await close({ data: { position_id: id, exit_price: exit } });
      toast.success(`Closed. PnL: $${r.pnl.toFixed(2)}`);
      qc.invalidateQueries({ queryKey: ["futures-positions"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Open Positions ({open.length})</h3>
      {open.length === 0 ? (
        <div className="text-muted-foreground text-sm text-center py-8 border border-dashed border-white/10 rounded">No open positions.</div>
      ) : (
        <div className="space-y-2">
          {open.map((p) => {
            const cur = priceMap.get(p.symbol) ?? p.entry_price;
            const qty = p.size_usdt / p.entry_price;
            const pnl = p.side === "long" ? (cur - p.entry_price) * qty : (p.entry_price - cur) * qty;
            const pnlPct = (pnl / p.margin_usdt) * 100;
            const up = pnl >= 0;
            return (
              <div key={p.id} className="bg-bg-main border border-white/5 rounded p-3 grid grid-cols-2 md:grid-cols-6 gap-3 items-center text-xs font-mono">
                <div>
                  <div className="font-bold text-sm">{p.symbol}/USDT</div>
                  <div className={p.side === "long" ? "text-success" : "text-danger"}>{p.side.toUpperCase()} {p.leverage}x</div>
                </div>
                <div><div className="text-muted-foreground text-[10px] uppercase">Entry</div>${fmtPrice(p.entry_price)}</div>
                <div><div className="text-muted-foreground text-[10px] uppercase">Mark</div>${fmtPrice(cur)}</div>
                <div><div className="text-muted-foreground text-[10px] uppercase">Liq</div><span className="text-danger">${fmtPrice(p.liquidation_price)}</span></div>
                <div><div className="text-muted-foreground text-[10px] uppercase">PnL</div><span className={up ? "text-success" : "text-danger"}>{up ? "+" : ""}${pnl.toFixed(2)} ({pnlPct.toFixed(2)}%)</span></div>
                <button onClick={() => onClose(p.id, p.symbol)} className="bg-white/10 hover:bg-white/20 py-2 rounded text-xs font-semibold">Close</button>
              </div>
            );
          })}
        </div>
      )}
      {closed.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mt-6 mb-3 text-muted-foreground uppercase tracking-wider">History</h3>
          <div className="space-y-1">
            {closed.slice(0, 10).map((p) => (
              <div key={p.id} className="text-xs font-mono flex justify-between text-muted-foreground py-1.5 border-b border-white/5">
                <span>{p.symbol} {p.side.toUpperCase()} {p.leverage}x</span>
                <span className={(p.realized_pnl ?? 0) >= 0 ? "text-success" : "text-danger"}>
                  {(p.realized_pnl ?? 0) >= 0 ? "+" : ""}${(p.realized_pnl ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {open.length === 0 && closed.length === 0 && (
        <p className="text-xs text-muted-foreground mt-4">
          New to futures? <Link to="/markets" className="text-accent">Browse markets</Link> first.
        </p>
      )}
    </div>
  );
}
