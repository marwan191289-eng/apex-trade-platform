import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TickerBar, TickerBarFallback } from "@/components/TickerBar";
import { OrderBook } from "@/components/OrderBook";
import { TradePanel } from "@/components/TradePanel";
import { CandlestickChart } from "@/components/CandlestickChart";
import { coinDetailQuery, marketsQuery, symbolToId } from "@/lib/coingecko";
import { fmtPrice, fmtPct, fmtCompact } from "@/lib/format";

export const Route = createFileRoute("/trade/$symbol")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.symbol.toUpperCase()}/USDT — Trade — TradeXray` },
      { name: "description", content: `Trade ${params.symbol.toUpperCase()} with live price chart, order book and instant execution.` },
    ],
  }),
  loader: async ({ context, params }) => {
    const coins = await context.queryClient.ensureQueryData(marketsQuery);
    const id = symbolToId(params.symbol, coins);
    context.queryClient.ensureQueryData(coinDetailQuery(id));
  },
  errorComponent: ({ error }) => <div className="p-8 text-danger">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: TradePage,
});


function TradePage() {
  return (
    <div className="min-h-screen bg-bg-main">
      <Header />
      <Suspense fallback={<TickerBarFallback />}><TickerBar /></Suspense>
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
        <Content />
      </Suspense>
      <Footer />
    </div>
  );
}

function Content() {
  const { symbol } = Route.useParams();
  const { data: coins } = useSuspenseQuery(marketsQuery);
  const id = symbolToId(symbol, coins);
  const { data: coin } = useSuspenseQuery(coinDetailQuery(id));
  


  if (!coin) return <div className="p-8">Asset not found.</div>;

  const up = (coin.price_change_percentage_24h ?? 0) >= 0;
  const sym = coin.symbol.toUpperCase();

  return (
    <main className="max-w-[1600px] mx-auto p-4">
      {/* Asset header */}
      <div className="bg-bg-card rounded-lg p-4 mb-4 border border-white/5 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <img src={coin.image} alt="" width={36} height={36} className="rounded-full" />
          <div>
            <div className="text-lg font-bold">{sym}/USDT</div>
            <div className="text-xs text-muted-foreground">{coin.name}</div>
          </div>
        </div>
        <div>
          <div className={`text-2xl font-bold font-mono ${up ? "text-success" : "text-danger"}`}>${fmtPrice(coin.current_price)}</div>
          <div className={`text-xs font-mono ${up ? "text-success" : "text-danger"}`}>{fmtPct(coin.price_change_percentage_24h)} (24h)</div>
        </div>
        <Metric label="24h Volume" value={fmtCompact(coin.total_volume)} />
        <Metric label="Market Cap" value={fmtCompact(coin.market_cap)} />
        <Metric label="Rank" value={`#${coin.market_cap_rank}`} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-3 order-2 lg:order-1">
          <OrderBook price={coin.current_price} symbol={sym} />
        </div>
        <div className="col-span-12 lg:col-span-6 order-1 lg:order-2">
          <CandlestickChart symbol={sym} />
        </div>
        <div className="col-span-12 lg:col-span-3 order-3">
          <TradePanel symbol={sym} price={coin.current_price} />
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="hidden md:block">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-sm font-mono">{value}</div>
    </div>
  );
}
