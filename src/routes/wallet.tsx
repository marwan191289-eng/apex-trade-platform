import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TickerBar, TickerBarFallback } from "@/components/TickerBar";
import { portfolioQuery } from "@/lib/portfolio-query";
import { fmtPrice, fmtUsd, fmtPct } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useLivePrices } from "@/lib/live-prices";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Wallet — TradeXray" }] }),
  component: WalletPage,
});

function WalletPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return <div className="min-h-screen bg-bg-main grid place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-bg-main">
      <Header />
      <Suspense fallback={<TickerBarFallback />}><TickerBar /></Suspense>
      <WalletContent />
      <Footer />
    </div>
  );
}

const ALLOC_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

function WalletContent() {
  const { t } = useI18n();
  const portfolio = useQuery(portfolioQuery);
  const live = useLivePrices();
  const [tab, setTab] = useState<"holdings" | "history">("holdings");

  if (portfolio.isLoading) return <div className="max-w-[1600px] mx-auto p-8 text-muted-foreground">Loading…</div>;
  if (portfolio.error) return <div className="max-w-[1600px] mx-auto p-8 text-danger">{(portfolio.error as Error).message}</div>;

  const data = portfolio.data!;

  const enriched = useMemo(() => data.holdings.map((h) => {
    const tick = live[h.symbol.toLowerCase()];
    const price = tick?.price ?? h.avg_price;
    const ch24 = tick?.changePct ?? 0;
    const value = h.amount * price;
    const cost = h.amount * h.avg_price;
    const pnl = value - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    return { ...h, price, ch24, value, cost, pnl, pnlPct };
  }), [data.holdings, live]);

  const investedValue = enriched.reduce((s, h) => s + h.cost, 0);
  const currentValue = enriched.reduce((s, h) => s + h.value, 0);
  const pnl = currentValue - investedValue;
  const pnlPct = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
  const totalBalance = data.balance + currentValue;
  const change24h = enriched.reduce((s, h) => {
    const prev = h.value / (1 + h.ch24 / 100);
    return s + (h.value - prev);
  }, 0);
  const change24hPct = currentValue > 0 ? (change24h / (currentValue - change24h)) * 100 : 0;

  const sorted = [...enriched].sort((a, b) => b.value - a.value);
  const cashAlloc = totalBalance > 0 ? (data.balance / totalBalance) * 100 : 0;

  return (
    <main className="max-w-[1600px] mx-auto p-4 md:p-6">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">{t("wallet.title")}</h1>
          <p className="text-muted-foreground text-sm">Real-time portfolio valuation powered by Binance live feed.</p>
        </div>
        <Link to="/markets" className="bg-accent text-bg-main px-4 py-2 rounded-md font-semibold text-sm hover:brightness-110">+ Add assets</Link>
      </div>

      {/* Hero card */}
      <div className="bg-gradient-to-br from-bg-card via-bg-card to-accent/5 border border-white/5 rounded-xl p-6 md:p-8 mb-6">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Total Net Worth</div>
            <div className="text-4xl md:text-5xl font-bold font-mono">{fmtUsd(totalBalance)}</div>
            <div className="flex items-center gap-4 mt-3 text-sm font-mono">
              <span className={change24h >= 0 ? "text-success" : "text-danger"}>
                {change24h >= 0 ? "▲" : "▼"} {fmtUsd(Math.abs(change24h))} ({fmtPct(change24hPct)}) 24h
              </span>
              <span className={pnl >= 0 ? "text-success" : "text-danger"}>
                {pnl >= 0 ? "+" : ""}{fmtUsd(pnl)} ({fmtPct(pnlPct)}) all-time
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Cash USDT" value={fmtUsd(data.balance)} />
            <MiniStat label="Invested" value={fmtUsd(currentValue)} />
            <MiniStat label="Assets" value={String(enriched.length)} />
          </div>
        </div>

        {/* Allocation bar */}
        {totalBalance > 0 && (
          <div className="mt-6">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Allocation</div>
            <div className="flex h-3 rounded overflow-hidden bg-bg-main">
              <div style={{ width: `${cashAlloc}%`, background: "#475569" }} title={`USDT ${cashAlloc.toFixed(1)}%`} />
              {sorted.map((h, i) => {
                const w = (h.value / totalBalance) * 100;
                return <div key={h.symbol} style={{ width: `${w}%`, background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} title={`${h.symbol} ${w.toFixed(1)}%`} />;
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: "#475569" }} />USDT {cashAlloc.toFixed(1)}%</span>
              {sorted.slice(0, 8).map((h, i) => (
                <span key={h.symbol} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />
                  {h.symbol} {((h.value / totalBalance) * 100).toFixed(1)}%
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 mb-4">
        {(["holdings", "history"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === k ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {k === "holdings" ? `Holdings (${enriched.length})` : `History (${data.orders.length})`}
          </button>
        ))}
      </div>

      {tab === "holdings" ? (
        enriched.length === 0 ? (
          <div className="bg-bg-card border border-white/5 rounded-lg p-12 text-center text-muted-foreground">
            {t("wallet.no_holdings")}
            <div className="mt-4"><Link to="/markets" className="text-accent font-semibold hover:underline">→ {t("nav.markets")}</Link></div>
          </div>
        ) : (
          <div className="bg-bg-card border border-white/5 rounded-lg overflow-hidden">
            <table className="w-full text-sm" dir="ltr">
              <thead className="text-muted-foreground text-[11px] border-b border-white/5 bg-bg-main/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Asset</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Avg Cost</th>
                  <th className="px-4 py-3 text-right font-medium">Live Price</th>
                  <th className="px-4 py-3 text-right font-medium">24h</th>
                  <th className="px-4 py-3 text-right font-medium">Value</th>
                  <th className="px-4 py-3 text-right font-medium">P&L</th>
                  <th className="px-4 py-3 text-right font-medium">Allocation</th>
                  <th className="px-4 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sorted.map((h, i) => {
                  const up = h.pnl >= 0;
                  const ch = h.ch24 >= 0;
                  const alloc = totalBalance > 0 ? (h.value / totalBalance) * 100 : 0;
                  return (
                    <tr key={h.symbol} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold" style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] + "30", color: ALLOC_COLORS[i % ALLOC_COLORS.length] }}>{h.symbol.slice(0, 2)}</span>
                          <span className="font-semibold">{h.symbol}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono">{h.amount.toFixed(6)}</td>
                      <td className="px-4 py-4 text-right font-mono text-muted-foreground">${fmtPrice(h.avg_price)}</td>
                      <td className="px-4 py-4 text-right font-mono">${fmtPrice(h.price)}</td>
                      <td className={`px-4 py-4 text-right font-mono text-xs ${ch ? "text-success" : "text-danger"}`}>{fmtPct(h.ch24)}</td>
                      <td className="px-4 py-4 text-right font-mono font-semibold">${fmtPrice(h.value)}</td>
                      <td className={`px-4 py-4 text-right font-mono ${up ? "text-success" : "text-danger"}`}>
                        {up ? "+" : ""}{fmtUsd(h.pnl)} <span className="text-[10px] opacity-70">({fmtPct(h.pnlPct)})</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16 h-1.5 bg-bg-main rounded overflow-hidden"><div className="h-full" style={{ width: `${alloc}%`, background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} /></div>
                          <span className="text-[10px] font-mono w-10 text-right text-muted-foreground">{alloc.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link to="/trade/$symbol" params={{ symbol: h.symbol }} className="text-accent text-xs font-semibold hover:underline">Trade →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        data.orders.length === 0 ? (
          <div className="bg-bg-card border border-white/5 rounded-lg p-12 text-center text-muted-foreground">{t("trade.no_trades")}</div>
        ) : (
          <div className="bg-bg-card border border-white/5 rounded-lg overflow-hidden">
            <table className="w-full text-sm" dir="ltr">
              <thead className="text-muted-foreground text-[11px] border-b border-white/5 bg-bg-main/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Asset</th>
                  <th className="px-4 py-3 text-left font-medium">Side</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold">{o.symbol}</td>
                    <td className={`px-4 py-3 uppercase text-xs font-bold ${o.side === "buy" ? "text-success" : "text-danger"}`}>{o.side}</td>
                    <td className="px-4 py-3 text-right font-mono">${fmtPrice(o.price)}</td>
                    <td className="px-4 py-3 text-right font-mono">{o.amount.toFixed(6)}</td>
                    <td className="px-4 py-3 text-right font-mono">${fmtPrice(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-main/40 border border-white/5 rounded-lg p-3">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm md:text-base font-bold font-mono truncate">{value}</div>
    </div>
  );
}
