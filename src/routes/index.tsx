import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TickerBar, TickerBarFallback } from "@/components/TickerBar";
import { MarketsTable } from "@/components/MarketsTable";
import { marketsQuery } from "@/lib/coingecko";
import { useI18n } from "@/lib/i18n";
import { fmtCompact } from "@/lib/format";
import { ArrowRight, ShieldCheck, Zap, Globe2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TradeXray — Professional Crypto Trading Platform" },
      { name: "description", content: "Trade Bitcoin, Ethereum and 500+ cryptocurrencies with live markets, advanced charts and a $10,000 virtual portfolio." },
      { property: "og:title", content: "TradeXray — Professional Crypto Trading" },
      { property: "og:description", content: "Live markets, futures, bots and copy trading. Paper-trade with $10,000 virtual USDT." },
      { property: "og:image", content: "https://tradexray-v.lovable.app/og-image.jpg" },
      { property: "og:url", content: "https://tradexray-v.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://tradexray-v.lovable.app/" }],
  }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(marketsQuery); },
  errorComponent: ({ error }) => <div className="p-8 text-danger">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: Index,
});


function Index() {
  return (
    <div className="min-h-screen bg-bg-main text-foreground">
      <Header />
      <Suspense fallback={<TickerBarFallback />}>
        <TickerBar />
      </Suspense>
      <Hero />
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading markets…</div>}>
        <FeaturedMarkets />
      </Suspense>
      <Features />
      <CTA />
      <Footer />
    </div>
  );
}

function Hero() {
  const { t } = useI18n();
  return (
    <section className="gradient-hero">
      <div className="max-w-[1600px] mx-auto px-4 py-20 md:py-28">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/5 text-accent text-xs font-medium mb-6">
            <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" />
            {t("common.live")} · Paper Trading Edition
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6 text-balance">
            {t("hero.title")}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mb-10 text-pretty leading-relaxed">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/signup" className="bg-accent text-bg-main px-6 py-3 rounded font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2 glow-accent">
              {t("hero.cta.primary")} <ArrowRight size={16} />
            </Link>
            <Link to="/markets" className="bg-bg-card border border-white/10 px-6 py-3 rounded font-medium text-sm hover:bg-bg-elevated transition-colors">
              {t("hero.cta.secondary")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedMarkets() {
  const { t } = useI18n();
  const { data } = useSuspenseQuery(marketsQuery);
  const totalVol = data.reduce((s, c) => s + (c.total_volume ?? 0), 0);
  const totalCap = data.reduce((s, c) => s + (c.market_cap ?? 0), 0);

  return (
    <section className="max-w-[1600px] mx-auto px-4 py-12">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        <Stat label={t("hero.stat.assets")} value={`${data.length}+`} />
        <Stat label={t("hero.stat.volume")} value={fmtCompact(totalVol)} />
        <Stat label="Market Cap" value={fmtCompact(totalCap)} hideOnMobile />
      </div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-1">{t("markets.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("markets.subtitle")}</p>
        </div>
        <Link to="/markets" className="text-accent text-sm font-semibold hover:underline flex items-center gap-1">
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <MarketsTable coins={data} limit={8} />
    </section>
  );
}

function Stat({ label, value, hideOnMobile }: { label: string; value: string; hideOnMobile?: boolean }) {
  return (
    <div className={`bg-bg-card border border-white/5 rounded-lg p-5 ${hideOnMobile ? "hidden md:block" : ""}`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-bold font-mono">{value}</div>
    </div>
  );
}

function Features() {
  const items = [
    { icon: Zap, title: "Low-Latency Execution", text: "Orders fill instantly against live market prices from CoinGecko." },
    { icon: ShieldCheck, title: "Safe Paper Trading", text: "$10,000 virtual USDT on signup. Learn the markets without risk." },
    { icon: Globe2, title: "Bilingual Interface", text: "Full Arabic (RTL) and English support across every screen." },
  ];
  return (
    <section className="max-w-[1600px] mx-auto px-4 py-16">
      <div className="grid md:grid-cols-3 gap-4">
        {items.map((it, i) => (
          <div key={i} className="bg-bg-card border border-white/5 rounded-lg p-6">
            <div className="size-10 rounded-md bg-accent/10 text-accent grid place-items-center mb-4">
              <it.icon size={20} />
            </div>
            <h3 className="font-semibold mb-2">{it.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{it.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  const { t } = useI18n();
  return (
    <section className="max-w-[1600px] mx-auto px-4 py-16">
      <div className="bg-bg-card border border-accent/20 rounded-xl p-10 md:p-16 text-center gradient-hero">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">{t("auth.signup.subtitle")}</h2>
        <Link to="/signup" className="inline-flex items-center gap-2 bg-accent text-bg-main px-6 py-3 rounded font-bold text-sm hover:brightness-110 transition-all">
          {t("hero.cta.primary")} <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
