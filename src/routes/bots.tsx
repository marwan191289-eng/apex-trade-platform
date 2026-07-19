import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState, useMemo } from "react";
import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { marketsQuery, type MarketCoin } from "@/lib/coingecko";
import { createBot, stopBot, listBots } from "@/lib/bots.functions";
import { fmtPrice, fmtUsd } from "@/lib/format";
import { useLivePrice } from "@/lib/live-prices";

const botsQuery = queryOptions({ queryKey: ["bots"], queryFn: () => listBots(), staleTime: 10_000 });

export const Route = createFileRoute("/bots")({
  head: () => ({ meta: [
    { title: "Trading Bots — TradeXray" },
    { name: "description", content: "Automate crypto strategies with Grid and DCA trading bots powered by live Binance data." },
    { property: "og:title", content: "Automated Trading Bots — TradeXray" },
    { property: "og:description", content: "Deploy Grid and DCA bots to trade 24/7 with live market data." },
    { property: "og:image", content: "https://tradexray-v.lovable.app/og-image.jpg" },
    { property: "og:url", content: "https://tradexray-v.lovable.app/bots" },
  ], links: [{ rel: "canonical", href: "https://tradexray-v.lovable.app/bots" }] }),
  errorComponent: ({ error }) => <div className="p-8 text-danger">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: BotsPage,
});


function BotsPage() {
  return (
    <div className="min-h-screen bg-bg-main">
      <Header />
      <main className="max-w-[1600px] mx-auto p-4 md:p-6">
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
  const { data: bots } = useSuspenseQuery(botsQuery);
  const active = bots.filter((b) => b.status !== "stopped");
  const totalInvested = active.reduce((s, b) => s + b.investment_usdt, 0);
  const totalPnl = bots.reduce((s, b) => s + b.total_pnl, 0);
  const totalTrades = bots.reduce((s, b) => s + b.total_trades, 0);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-1">Trading Bots</h1>
        <p className="text-muted-foreground text-sm">Run automated strategies 24/7 — Grid for sideways markets, DCA for long-term accumulation.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Active Bots" value={String(active.length)} />
        <Stat label="Total Invested" value={fmtUsd(totalInvested)} />
        <Stat label="Lifetime P&L" value={fmtUsd(totalPnl)} accent={totalPnl >= 0 ? "success" : "danger"} />
        <Stat label="Trades Executed" value={totalTrades.toLocaleString()} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5"><CreateBotPanel coins={coins} /></div>
        <div className="col-span-12 lg:col-span-7"><BotsList /></div>
      </div>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "success" | "danger" }) {
  return (
    <div className="bg-bg-card border border-white/5 rounded-lg p-4">
      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">{label}</div>
      <div className={`text-xl font-bold font-mono ${accent === "success" ? "text-success" : accent === "danger" ? "text-danger" : ""}`}>{value}</div>
    </div>
  );
}

function CreateBotPanel({ coins }: { coins: MarketCoin[] }) {
  const [tab, setTab] = useState<"grid" | "dca">("grid");
  return (
    <div className="bg-bg-card border border-white/5 rounded-xl p-5 sticky top-4">
      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Create Bot</div>
      <div className="flex gap-2 mb-5 bg-bg-main p-1 rounded-lg">
        <button onClick={() => setTab("grid")} className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${tab === "grid" ? "bg-accent text-bg-main" : "text-muted-foreground"}`}>⚡ Grid Bot</button>
        <button onClick={() => setTab("dca")} className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${tab === "dca" ? "bg-accent text-bg-main" : "text-muted-foreground"}`}>📊 DCA Bot</button>
      </div>
      {tab === "grid" ? <GridForm coins={coins} /> : <DcaForm coins={coins} />}
    </div>
  );
}

function GridForm({ coins }: { coins: MarketCoin[] }) {
  const create = useServerFn(createBot);
  const qc = useQueryClient();
  const [symbol, setSymbol] = useState("BTC");
  const [investment, setInvestment] = useState(500);
  const [grids, setGrids] = useState(20);
  const live = useLivePrice(symbol);
  const fallback = coins.find((c) => c.symbol.toUpperCase() === symbol)?.current_price ?? 0;
  const price = live?.price ?? fallback;
  const [lower, setLower] = useState(price * 0.9);
  const [upper, setUpper] = useState(price * 1.1);

  const profitPerGrid = price > 0 ? ((upper - lower) / grids / price) * 100 : 0;
  const estDailyTrades = Math.min(grids, 8);
  const estDailyReturn = profitPerGrid * estDailyTrades * 0.6;
  const estApy = estDailyReturn * 365;
  const inRange = price >= lower && price <= upper;

  const submit = async () => {
    try {
      await create({ data: { bot_type: "grid", symbol, investment_usdt: investment, lower_price: lower, upper_price: upper, grid_count: grids } });
      toast.success("Grid bot started");
      qc.invalidateQueries({ queryKey: ["bots"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="space-y-3 text-sm">
      <Select label="Trading Pair" value={symbol} onChange={(v) => { setSymbol(v); const c = coins.find((x) => x.symbol.toUpperCase() === v); const p = c?.current_price ?? 0; setLower(p * 0.9); setUpper(p * 1.1); }}>
        {coins.slice(0, 80).map((c) => <option key={c.symbol} value={c.symbol.toUpperCase()}>{c.symbol.toUpperCase()}/USDT</option>)}
      </Select>

      <div className="bg-bg-main rounded-lg p-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase">Live Price</div>
          <div className="font-mono font-bold text-lg">${fmtPrice(price)}</div>
        </div>
        <div className={`text-[10px] font-bold px-2 py-1 rounded ${inRange ? "bg-success/20 text-success" : "bg-warn/20 text-amber-400"}`}>
          {inRange ? "● IN RANGE" : "○ OUT OF RANGE"}
        </div>
      </div>

      <Num label="Investment (USDT)" value={investment} onChange={setInvestment} />
      <div className="grid grid-cols-2 gap-3">
        <Num label="Lower Price" value={lower} onChange={setLower} step={0.01} />
        <Num label="Upper Price" value={upper} onChange={setUpper} step={0.01} />
      </div>
      <Num label="Grid Count" value={grids} onChange={setGrids} />

      <div className="bg-gradient-to-br from-accent/10 to-transparent border border-accent/20 rounded-lg p-3 space-y-1.5">
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Profit / Grid</span><span className="font-mono text-success">{profitPerGrid.toFixed(3)}%</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Est. Daily Return</span><span className="font-mono text-success">{estDailyReturn.toFixed(2)}%</span></div>
        <div className="flex justify-between text-sm font-bold border-t border-white/5 pt-1.5"><span>Projected APY</span><span className="font-mono text-success">{estApy.toFixed(0)}%</span></div>
      </div>

      <button onClick={submit} className="w-full bg-accent text-bg-main py-3 rounded-lg font-bold hover:brightness-110 transition">Launch Grid Bot</button>
    </div>
  );
}

function DcaForm({ coins }: { coins: MarketCoin[] }) {
  const create = useServerFn(createBot);
  const qc = useQueryClient();
  const [symbol, setSymbol] = useState("BTC");
  const [investment, setInvestment] = useState(500);
  const [per, setPer] = useState(25);
  const [hours, setHours] = useState(24);
  const live = useLivePrice(symbol);
  const fallback = coins.find((c) => c.symbol.toUpperCase() === symbol)?.current_price ?? 0;
  const price = live?.price ?? fallback;

  const orders = Math.max(1, Math.floor(investment / per));
  const durationDays = (orders * hours) / 24;

  const submit = async () => {
    try {
      await create({ data: { bot_type: "dca", symbol, investment_usdt: investment, per_order_usdt: per, interval_hours: hours } });
      toast.success("DCA bot started");
      qc.invalidateQueries({ queryKey: ["bots"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="space-y-3 text-sm">
      <Select label="Trading Pair" value={symbol} onChange={setSymbol}>
        {coins.slice(0, 80).map((c) => <option key={c.symbol} value={c.symbol.toUpperCase()}>{c.symbol.toUpperCase()}/USDT</option>)}
      </Select>

      <div className="bg-bg-main rounded-lg p-3">
        <div className="text-[10px] text-muted-foreground uppercase">Live Price</div>
        <div className="font-mono font-bold text-lg">${fmtPrice(price)}</div>
      </div>

      <Num label="Total Budget (USDT)" value={investment} onChange={setInvestment} />
      <Num label="Per-Order Amount (USDT)" value={per} onChange={setPer} />
      <Num label="Interval (hours)" value={hours} onChange={setHours} />

      <div className="bg-gradient-to-br from-accent/10 to-transparent border border-accent/20 rounded-lg p-3 space-y-1.5">
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Orders</span><span className="font-mono">{orders}</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Duration</span><span className="font-mono">{durationDays.toFixed(1)} days</span></div>
        <div className="flex justify-between text-sm font-bold border-t border-white/5 pt-1.5"><span>Strategy</span><span className="font-mono text-accent">Reduce volatility risk</span></div>
      </div>

      <button onClick={submit} className="w-full bg-accent text-bg-main py-3 rounded-lg font-bold hover:brightness-110 transition">Launch DCA Bot</button>
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-bg-main border border-white/10 rounded-lg p-2.5 text-sm font-semibold focus:outline-none focus:border-accent">{children}</select>
    </div>
  );
}
function Num({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">{label}</label>
      <input type="number" step={step} value={value} onChange={(e) => onChange(+e.target.value || 0)} className="w-full bg-bg-main border border-white/10 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-accent" />
    </div>
  );
}

function BotsList() {
  const { data: bots } = useSuspenseQuery(botsQuery);
  const stop = useServerFn(stopBot);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "running" | "stopped">("all");

  const onStop = async (id: string) => {
    try {
      await stop({ data: { bot_id: id } });
      toast.success("Bot stopped");
      qc.invalidateQueries({ queryKey: ["bots"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const filtered = useMemo(() => bots.filter((b) => filter === "all" ? true : filter === "running" ? b.status !== "stopped" : b.status === "stopped"), [bots, filter]);

  return (
    <div className="bg-bg-card border border-white/5 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-muted-foreground uppercase tracking-widest">My Bots</div>
        <div className="flex gap-1 bg-bg-main p-0.5 rounded-md text-[11px]">
          {(["all", "running", "stopped"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded capitalize ${filter === f ? "bg-accent text-bg-main font-bold" : "text-muted-foreground"}`}>{f}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && <div className="text-muted-foreground text-sm text-center py-16 border border-dashed border-white/10 rounded-lg">No bots yet. Create one →</div>}

      <div className="space-y-2">
        {filtered.map((b) => <BotRow key={b.id} b={b} onStop={() => onStop(b.id)} />)}
      </div>
    </div>
  );
}

function BotRow({ b, onStop }: { b: { id: string; bot_type: "grid" | "dca"; symbol: string; investment_usdt: number; status: string; total_pnl: number; total_trades: number; config: Record<string, number> }; onStop: () => void }) {
  const live = useLivePrice(b.symbol);
  const pnlPct = b.investment_usdt > 0 ? (b.total_pnl / b.investment_usdt) * 100 : 0;
  const up = b.total_pnl >= 0;
  const isRunning = b.status !== "stopped";

  return (
    <div className="bg-bg-main border border-white/5 rounded-lg p-4 hover:border-accent/30 transition">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${b.bot_type === "grid" ? "bg-accent/20 text-accent" : "bg-info/20 text-blue-400"}`}>{b.bot_type}</span>
          <div>
            <div className="font-bold">{b.symbol}/USDT</div>
            <div className="text-[10px] text-muted-foreground font-mono">Live: ${fmtPrice(live?.price ?? 0)}</div>
          </div>
        </div>
        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${isRunning ? "text-success" : "text-muted-foreground"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
          {b.status}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs font-mono mb-3">
        <div><div className="text-[9px] text-muted-foreground uppercase">Invested</div>${b.investment_usdt.toFixed(2)}</div>
        <div><div className="text-[9px] text-muted-foreground uppercase">P&L</div><span className={up ? "text-success" : "text-danger"}>{up ? "+" : ""}${b.total_pnl.toFixed(2)}</span></div>
        <div><div className="text-[9px] text-muted-foreground uppercase">ROI</div><span className={up ? "text-success" : "text-danger"}>{up ? "+" : ""}{pnlPct.toFixed(2)}%</span></div>
        <div><div className="text-[9px] text-muted-foreground uppercase">Trades</div>{b.total_trades}</div>
      </div>

      {isRunning && (
        <button onClick={onStop} className="w-full bg-danger/10 hover:bg-danger/20 text-danger py-2 rounded font-semibold text-xs">Stop Bot</button>
      )}
    </div>
  );
}
