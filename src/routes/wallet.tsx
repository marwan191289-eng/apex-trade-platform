import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TickerBar, TickerBarFallback } from "@/components/TickerBar";
import { portfolioQuery } from "@/lib/portfolio-query";
import { coinDetailQuery, symbolToId } from "@/lib/coingecko";
import { fmtPrice, fmtUsd, fmtPct } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Nexus" }] }),
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

function WalletContent() {
  const { t } = useI18n();
  const portfolio = useQuery(portfolioQuery);

  // Fetch live prices for each holding
  const symbols = portfolio.data?.holdings.map((h) => h.symbol.toLowerCase()) ?? [];
  const liveQueries = useQueries({
    queries: symbols.map((s) => coinDetailQuery(symbolToId(s))),
  });

  if (portfolio.isLoading) return <div className="max-w-[1600px] mx-auto p-8 text-muted-foreground">Loading…</div>;
  if (portfolio.error) return <div className="max-w-[1600px] mx-auto p-8 text-danger">{(portfolio.error as Error).message}</div>;

  const data = portfolio.data!;

  const livePrices = new Map<string, number>();
  liveQueries.forEach((q, i) => {
    if (q.data) livePrices.set(symbols[i].toUpperCase(), q.data.current_price);
  });

  const investedValue = data.holdings.reduce((s, h) => s + h.amount * h.avg_price, 0);
  const currentValue = data.holdings.reduce((s, h) => s + h.amount * (livePrices.get(h.symbol) ?? h.avg_price), 0);
  const pnl = currentValue - investedValue;
  const pnlPct = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
  const totalBalance = data.balance + currentValue;

  return (
    <main className="max-w-[1600px] mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">{t("wallet.title")}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label={t("wallet.total")} value={fmtUsd(totalBalance)} />
        <Stat label={t("wallet.available")} value={fmtUsd(data.balance)} />
        <Stat label={t("wallet.invested")} value={fmtUsd(currentValue)} />
        <Stat label={t("wallet.pnl")} value={fmtUsd(pnl)} sub={fmtPct(pnlPct)} positive={pnl >= 0} />
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4">{t("wallet.holdings")}</h2>
        {data.holdings.length === 0 ? (
          <div className="bg-bg-card border border-white/5 rounded-lg p-10 text-center text-muted-foreground">
            {t("wallet.no_holdings")}
            <div className="mt-4">
              <Link to="/markets" className="text-accent font-semibold hover:underline">→ {t("nav.markets")}</Link>
            </div>
          </div>
        ) : (
          <div className="bg-bg-card border border-white/5 rounded-lg overflow-hidden">
            <table className="w-full text-sm" dir="ltr">
              <thead className="text-muted-foreground text-[11px] border-b border-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Asset</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">Avg Price</th>
                  <th className="px-4 py-3 text-right font-medium">Current</th>
                  <th className="px-4 py-3 text-right font-medium">Value</th>
                  <th className="px-4 py-3 text-right font-medium">P&L</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.holdings.map((h) => {
                  const live = livePrices.get(h.symbol) ?? h.avg_price;
                  const value = h.amount * live;
                  const cost = h.amount * h.avg_price;
                  const p = value - cost;
                  const pPct = cost > 0 ? (p / cost) * 100 : 0;
                  const up = p >= 0;
                  return (
                    <tr key={h.symbol} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-4 font-semibold">{h.symbol}</td>
                      <td className="px-4 py-4 text-right font-mono">{h.amount.toFixed(6)}</td>
                      <td className="px-4 py-4 text-right font-mono">${fmtPrice(h.avg_price)}</td>
                      <td className="px-4 py-4 text-right font-mono">${fmtPrice(live)}</td>
                      <td className="px-4 py-4 text-right font-mono">${fmtPrice(value)}</td>
                      <td className={`px-4 py-4 text-right font-mono ${up ? "text-success" : "text-danger"}`}>
                        {fmtUsd(p)} <span className="text-[10px]">({fmtPct(pPct)})</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link to="/trade/$symbol" params={{ symbol: h.symbol }} className="text-accent text-xs font-semibold hover:underline">Trade</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4">{t("wallet.orders")}</h2>
        {data.orders.length === 0 ? (
          <div className="bg-bg-card border border-white/5 rounded-lg p-8 text-center text-muted-foreground text-sm">
            {t("trade.no_trades")}
          </div>
        ) : (
          <div className="bg-bg-card border border-white/5 rounded-lg overflow-hidden">
            <table className="w-full text-sm" dir="ltr">
              <thead className="text-muted-foreground text-[11px] border-b border-white/5">
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
                  <tr key={o.id}>
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
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-bg-card border border-white/5 rounded-lg p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className="text-xl md:text-2xl font-bold font-mono">{value}</div>
      {sub && <div className={`text-xs font-mono mt-1 ${positive ? "text-success" : "text-danger"}`}>{sub}</div>}
    </div>
  );
}
