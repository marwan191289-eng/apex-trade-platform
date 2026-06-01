import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
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
      { title: "Markets — Nexus" },
      { name: "description", content: "Live cryptocurrency prices, 24h change, market cap and volume for top 50 digital assets." },
      { property: "og:title", content: "Crypto Markets — Nexus" },
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
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{t("markets.title")}</h1>
        <p className="text-muted-foreground">{t("markets.subtitle")}</p>
      </div>
      <MarketsTable coins={data} />
    </>
  );
}
