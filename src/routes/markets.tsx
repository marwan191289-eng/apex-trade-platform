import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TickerBar, TickerBarFallback } from "@/components/TickerBar";
import { MarketsTable } from "@/components/MarketsTable";
import { marketsQuery, type MarketCoin } from "@/lib/coingecko";
import { useI18n } from "@/lib/i18n";
import { useLivePrices } from "@/lib/live-prices";
import { fmtCompact, fmtPct, fmtPrice } from "@/lib/format";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Crypto Markets — Live Prices — TradeXray" },
      { name: "description", content: "Live cryptocurrency prices, top gainers, losers and volume leaders for 500+ assets powered by Binance." },
      { property: "og:title", content: "Crypto Markets — TradeXray" },
      { property: "og:description", content: "Real-time prices for Bitcoin, Ethereum, Solana and 500+ assets." },
      { property: "og:image", content: "https://tradexray-v.lovable.app/og-image.jpg" },
      { property: "og:url", content: "https://tradexray-v.lovable.app/markets" },
    ],
    links: [{ rel: "canonical", href: "https://tradexray-v.lovable.app/markets" }],
  }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(marketsQuery); },
  errorComponent: ({ error }) => <div className="p-8 text-danger">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: MarketsPage,
});


function MarketsPage() {
  return (
    <div className="min-h-screen bg-bg-main">
      <Header />
      <Suspense fallback={<TickerBarFallback />}><TickerBar /></Suspense>
      <main className="max-w-[1600px] mx-auto px-4 py-8">
        <Suspense fallback={<div className="text-muted-foreground p-8 text-center">Loading…</div>}>
          <Content />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

type Tab = "all" | "gainers" | "losers" | "volume" | "watchlist";

function Content() {
  const { t } = useI18n();
  const { data } = useSuspenseQuery(marketsQuery);
  const live = useLivePrices();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  // Merge live data into coins
  const merged = useMemo(() => data.map((c) => {
    const tick = live[c.symbol.toLowerCase()];
    return tick ? { ...c, current_price: tick.price, price_change_percentage_24h: tick.changePct } : c;
  }), [data, live]);

  const totalMcap = merged.reduce((s, c) => s + (c.market_cap || 0), 0);
  const totalVol = merged.reduce((s, c) => s + (c.total_volume || 0), 0);
  const btc = merged.find((c) => c.symbol.toLowerCase() === "btc");
  const btcDom = btc && totalMcap > 0 ? (btc.market_cap / totalMcap) * 100 : 0;
  const gainersCount = merged.filter((c) => (c.price_change_percentage_24h ?? 0) > 0).length;

  const topGainers = [...merged].sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0)).slice(0, 5);
  const topLosers = [...merged].sort((a, b) => (a.price_change_percentage_24h ?? 0) - (b.price_change_percentage_24h ?? 0)).slice(0, 5);
  const topVolume = [...merged].sort((a, b) => (b.total_volume ?? 0) - (a.total_volume ?? 0)).slice(0, 5);

  const filtered = useMemo(() => {
    let list = merged;
    if (tab === "gainers") list = [...list].sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0));
    else if (tab === "losers") list = [...list].sort((a, b) => (a.price_change_percentage_24h ?? 0) - (b.price_change_percentage_24h ?? 0));
    else if (tab === "volume") list = [...list].sort((a, b) => (b.total_volume ?? 0) - (a.total_volume ?? 0));
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((c) => c.name.toLowerCase().includes(s) || c.symbol.toLowerCase().includes(s));
    return list;
  }, [merged, tab, q]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-1">{t("markets.title")}</h1>
        <p className="text-muted-foreground text-sm">Live prices and 24h statistics, streamed from Binance.</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <OverviewCard label="Total Market Cap" value={fmtCompact(totalMcap)} sub={`${merged.length} assets`} />
        <OverviewCard label="24h Volume" value={fmtCompact(totalVol)} sub="across all pairs" />
        <OverviewCard label="BTC Dominance" value={`${btcDom.toFixed(2)}%`} sub={btc ? `$${fmtPrice(btc.current_price)}` : ""} />
        <OverviewCard label="Market Sentiment" value={`${gainersCount}/${merged.length}`} sub={gainersCount > merged.length / 2 ? "Bullish 🟢" : "Bearish 🔴"} positive={gainersCount > merged.length / 2} />
      </div>

      {/* Top movers strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <MoverCard title="🚀 Top Gainers" items={topGainers} positive />
        <MoverCard title="📉 Top Losers" items={topLosers} positive={false} />
        <MoverCard title="🔥 Highest Volume" items={topVolume} volume />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4 justify-between">
        <div className="flex gap-1 bg-bg-card border border-white/5 rounded-lg p-1">
          {(["all", "gainers", "losers", "volume"] as Tab[]).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded text-xs font-semibold capitalize transition-colors ${tab === k ? "bg-accent text-bg-main" : "text-muted-foreground hover:text-foreground"}`}>{k}</button>
          ))}
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 500+ assets…"
          className="bg-bg-card border border-white/10 rounded-md px-3 py-2 text-sm w-full md:w-80 focus:outline-none focus:border-accent"
        />
      </div>

      <MarketsTable coins={filtered} />
    </>
  );
}

function OverviewCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-bg-card border border-white/5 rounded-lg p-4">
      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">{label}</div>
      <div className="text-lg md:text-xl font-bold font-mono">{value}</div>
      {sub && <div className={`text-[11px] mt-1 ${positive === undefined ? "text-muted-foreground" : positive ? "text-success" : "text-danger"}`}>{sub}</div>}
    </div>
  );
}

function MoverCard({ title, items, positive, volume }: { title: string; items: MarketCoin[]; positive?: boolean; volume?: boolean }) {
  return (
    <div className="bg-bg-card border border-white/5 rounded-lg p-4">
      <div className="text-xs font-bold mb-3">{title}</div>
      <div className="space-y-2">
        {items.map((c) => (
          <Link key={c.id} to="/trade/$symbol" params={{ symbol: c.symbol.toUpperCase() }} className="flex items-center justify-between text-xs hover:bg-white/5 -mx-2 px-2 py-1.5 rounded">
            <div className="flex items-center gap-2">
              <img src={c.image} alt="" width={18} height={18} className="rounded-full" />
              <span className="font-semibold uppercase">{c.symbol}</span>
            </div>
            <div className="font-mono">
              {volume ? (
                <span className="text-muted-foreground">{fmtCompact(c.total_volume)}</span>
              ) : (
                <span className={positive ? "text-success" : "text-danger"}>{fmtPct(c.price_change_percentage_24h ?? 0)}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
