import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { marketsQuery } from "@/lib/coingecko";
import { createBot, stopBot, listBots } from "@/lib/bots.functions";
import { fmtPrice } from "@/lib/format";

const botsQuery = queryOptions({ queryKey: ["bots"], queryFn: () => listBots(), staleTime: 10_000 });

export const Route = createFileRoute("/bots")({
  head: () => ({ meta: [{ title: "Trading Bots — Nexus" }, { name: "description", content: "Automated Grid and DCA trading bots." }] }),
  errorComponent: ({ error }) => <div className="p-8 text-danger">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: BotsPage,
});

function BotsPage() {
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
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-1">Trading Bots</h1>
        <p className="text-muted-foreground text-sm">Automate your strategy. Grid bot profits from sideways markets; DCA averages your entry over time.</p>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5"><CreateBotPanel coins={coins} /></div>
        <div className="col-span-12 lg:col-span-7"><BotsList /></div>
      </div>
    </>
  );
}

function CreateBotPanel({ coins }: { coins: Array<{ symbol: string; current_price: number }> }) {
  const [tab, setTab] = useState<"grid" | "dca">("grid");
  return (
    <div className="bg-bg-card border border-white/5 rounded-lg p-5">
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab("grid")} className={`flex-1 py-2 rounded text-sm font-semibold ${tab === "grid" ? "bg-accent text-bg-main" : "bg-bg-main text-muted-foreground"}`}>Grid Bot</button>
        <button onClick={() => setTab("dca")} className={`flex-1 py-2 rounded text-sm font-semibold ${tab === "dca" ? "bg-accent text-bg-main" : "bg-bg-main text-muted-foreground"}`}>DCA Bot</button>
      </div>
      {tab === "grid" ? <GridForm coins={coins} /> : <DcaForm coins={coins} />}
    </div>
  );
}

function GridForm({ coins }: { coins: Array<{ symbol: string; current_price: number }> }) {
  const create = useServerFn(createBot);
  const qc = useQueryClient();
  const [symbol, setSymbol] = useState("BTC");
  const [investment, setInvestment] = useState(500);
  const [grids, setGrids] = useState(20);
  const price = coins.find((c) => c.symbol.toUpperCase() === symbol)?.current_price ?? 0;
  const [lower, setLower] = useState(price * 0.9);
  const [upper, setUpper] = useState(price * 1.1);

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
      <Select label="Pair" value={symbol} onChange={(v) => { setSymbol(v); const p = coins.find((c) => c.symbol.toUpperCase() === v)?.current_price ?? 0; setLower(p * 0.9); setUpper(p * 1.1); }}>
        {coins.slice(0, 50).map((c) => <option key={c.symbol} value={c.symbol.toUpperCase()}>{c.symbol.toUpperCase()}/USDT</option>)}
      </Select>
      <Num label="Investment (USDT)" value={investment} onChange={setInvestment} />
      <div className="grid grid-cols-2 gap-3">
        <Num label="Lower price" value={lower} onChange={setLower} step={0.01} />
        <Num label="Upper price" value={upper} onChange={setUpper} step={0.01} />
      </div>
      <Num label="Number of grids" value={grids} onChange={setGrids} />
      <div className="text-xs text-muted-foreground font-mono">Profit / grid ≈ {(((upper - lower) / grids / price) * 100).toFixed(3)}% · Current price ${fmtPrice(price)}</div>
      <button onClick={submit} className="w-full bg-accent text-bg-main py-3 rounded font-bold hover:brightness-110">Create Grid Bot</button>
    </div>
  );
}

function DcaForm({ coins }: { coins: Array<{ symbol: string; current_price: number }> }) {
  const create = useServerFn(createBot);
  const qc = useQueryClient();
  const [symbol, setSymbol] = useState("BTC");
  const [investment, setInvestment] = useState(500);
  const [per, setPer] = useState(25);
  const [hours, setHours] = useState(24);

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
      <Select label="Pair" value={symbol} onChange={setSymbol}>
        {coins.slice(0, 50).map((c) => <option key={c.symbol} value={c.symbol.toUpperCase()}>{c.symbol.toUpperCase()}/USDT</option>)}
      </Select>
      <Num label="Total budget (USDT)" value={investment} onChange={setInvestment} />
      <Num label="Per-order amount (USDT)" value={per} onChange={setPer} />
      <Num label="Interval (hours)" value={hours} onChange={setHours} />
      <div className="text-xs text-muted-foreground font-mono">~{Math.floor(investment / per)} orders over {(Math.floor(investment / per) * hours / 24).toFixed(1)} days</div>
      <button onClick={submit} className="w-full bg-accent text-bg-main py-3 rounded font-bold hover:brightness-110">Create DCA Bot</button>
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-bg-main border border-white/10 rounded p-2 text-sm">{children}</select>
    </div>
  );
}
function Num({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1.5">{label}</label>
      <input type="number" step={step} value={value} onChange={(e) => onChange(+e.target.value || 0)} className="w-full bg-bg-main border border-white/10 rounded p-2 text-sm font-mono" />
    </div>
  );
}

function BotsList() {
  const { data: bots } = useSuspenseQuery(botsQuery);
  const stop = useServerFn(stopBot);
  const qc = useQueryClient();
  const active = bots.filter((b) => b.status !== "stopped");

  const onStop = async (id: string) => {
    try {
      await stop({ data: { bot_id: id } });
      toast.success("Bot stopped");
      qc.invalidateQueries({ queryKey: ["bots"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="bg-bg-card border border-white/5 rounded-lg p-5">
      <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">My Bots ({active.length} active)</h3>
      {bots.length === 0 && <div className="text-muted-foreground text-sm text-center py-10 border border-dashed border-white/10 rounded">No bots yet. Create one →</div>}
      <div className="space-y-2">
        {bots.map((b) => (
          <div key={b.id} className="bg-bg-main border border-white/5 rounded p-3 grid grid-cols-2 md:grid-cols-5 gap-3 items-center text-xs font-mono">
            <div>
              <div className="font-bold text-sm uppercase">{b.bot_type} · {b.symbol}</div>
              <div className={`text-[10px] ${b.status === "running" ? "text-success" : "text-muted-foreground"}`}>{b.status.toUpperCase()}</div>
            </div>
            <div><div className="text-muted-foreground text-[10px] uppercase">Investment</div>${b.investment_usdt.toFixed(2)}</div>
            <div><div className="text-muted-foreground text-[10px] uppercase">PnL</div><span className={b.total_pnl >= 0 ? "text-success" : "text-danger"}>{b.total_pnl >= 0 ? "+" : ""}${b.total_pnl.toFixed(2)}</span></div>
            <div><div className="text-muted-foreground text-[10px] uppercase">Trades</div>{b.total_trades}</div>
            {b.status !== "stopped" ? (
              <button onClick={() => onStop(b.id)} className="bg-danger/20 text-danger hover:bg-danger/30 py-2 rounded font-semibold">Stop</button>
            ) : <span className="text-muted-foreground text-center">—</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
