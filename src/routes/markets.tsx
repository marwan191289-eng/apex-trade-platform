import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TickerBar, TickerBarFallback } from "@/components/TickerBar";
import { MarketsTable } from "@/components/MarketsTable";
import { marketsQuery } from "@/lib/coingecko";
import { useI18n } from "@/lib/i18n";


export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Markets — TradeXray" },
      { name: "description", content: "Live cryptocurrency prices, 24h change, market cap and volume for top 50 digital assets." },
      { property: "og:title", content: "Crypto Markets — TradeXray" },
      { property: "og:description", content: "Real-time prices for Bitcoin, Ethereum, Solana and more." },
    ],
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

function Content() {
  const { t } = useI18n();
  const { data } = useSuspenseQuery(marketsQuery);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter(
      (c) => c.name.toLowerCase().includes(s) || c.symbol.toLowerCase().includes(s)
    );
  }, [data, q]);
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{t("markets.title")}</h1>
          <p className="text-muted-foreground">
            {filtered.length} / {data.length} assets
          </p>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or symbol…"
          className="bg-bg-card border border-white/10 rounded-md px-3 py-2 text-sm w-full md:w-80 focus:outline-none focus:border-accent"
        />
      </div>
      <MarketsTable coins={filtered} />
    </>
  );
}

