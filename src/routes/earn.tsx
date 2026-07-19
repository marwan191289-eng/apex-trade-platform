import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { listStakingProducts, stake, redeem, listMyStakes } from "@/lib/earn.functions";

const productsQuery = queryOptions({ queryKey: ["staking-products"], queryFn: () => listStakingProducts(), staleTime: 60_000 });
const stakesQuery = queryOptions({ queryKey: ["my-stakes"], queryFn: () => listMyStakes(), staleTime: 10_000 });

export const Route = createFileRoute("/earn")({
  head: () => ({ meta: [
    { title: "Earn — Crypto Staking & Yield — TradeXray" },
    { name: "description", content: "Stake crypto on TradeXray and earn passive yield up to 12% APY with flexible and locked savings products." },
    { property: "og:title", content: "Earn Passive Yield on Crypto — TradeXray" },
    { property: "og:description", content: "Flexible and locked staking products with APY up to 12%. Put idle assets to work." },
    { property: "og:image", content: "https://tradexray-v.lovable.app/og-image.jpg" },
    { property: "og:url", content: "https://tradexray-v.lovable.app/earn" },
  ], links: [{ rel: "canonical", href: "https://tradexray-v.lovable.app/earn" }] }),
  errorComponent: ({ error }) => <div className="p-8 text-danger">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: EarnPage,
});


function EarnPage() {
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
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-1">Earn</h1>
        <p className="text-muted-foreground text-sm">Put idle assets to work. Flexible savings let you redeem any time; locked products pay higher APY.</p>
      </div>
      <MyStakes />
      <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Available Products</h2>
      <ProductsList />
    </>
  );
}

function ProductsList() {
  const { data: products } = useSuspenseQuery(productsQuery);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}

function ProductCard({ p }: { p: { id: string; asset_symbol: string; apy: number; lock_days: number; min_amount: number; is_flexible: boolean; badge: string | null } }) {
  const stk = useServerFn(stake);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState(100);

  const submit = async () => {
    try {
      await stk({ data: { product_id: p.id, amount_usdt: amt } });
      toast.success(`Staked $${amt} ${p.asset_symbol}`);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["my-stakes"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="bg-bg-card border border-white/5 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-lg">{p.asset_symbol}</div>
          <div className="text-[10px] text-muted-foreground uppercase">{p.is_flexible ? "Flexible" : `${p.lock_days}-day locked`}</div>
        </div>
        {p.badge && <span className="text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded">{p.badge}</span>}
      </div>
      <div className="mb-4">
        <div className="text-[10px] text-muted-foreground uppercase">Est. APY</div>
        <div className="text-3xl font-mono font-bold text-success">{p.apy.toFixed(2)}%</div>
      </div>
      <div className="text-[11px] text-muted-foreground mb-3">Min: {p.min_amount} {p.asset_symbol}</div>
      {open ? (
        <div className="space-y-2">
          <input type="number" value={amt} onChange={(e) => setAmt(+e.target.value || 0)} className="w-full bg-bg-main border border-white/10 rounded p-2 text-sm font-mono" placeholder="USDT" />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={submit} className="bg-accent text-bg-main py-2 rounded font-bold text-sm">Confirm</button>
            <button onClick={() => setOpen(false)} className="bg-white/5 py-2 rounded text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="w-full bg-accent text-bg-main py-2.5 rounded font-bold text-sm hover:brightness-110">Stake</button>
      )}
    </div>
  );
}

function MyStakes() {
  const { data: stakes } = useSuspenseQuery(stakesQuery);
  const rd = useServerFn(redeem);
  const qc = useQueryClient();
  const active = stakes.filter((s) => s.status === "active");
  if (active.length === 0) return null;

  const onRedeem = async (id: string) => {
    try {
      const r = await rd({ data: { stake_id: id } });
      toast.success(`Redeemed. Rewards: $${r.rewards.toFixed(4)}`);
      qc.invalidateQueries({ queryKey: ["my-stakes"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">My Stakes ({active.length})</h2>
      <div className="space-y-2">
        {active.map((s) => (
          <div key={s.id} className="bg-bg-card border border-white/5 rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-center text-xs font-mono">
            <div><div className="font-bold text-sm">{s.asset_symbol}</div><div className="text-[10px] text-success">{s.apy.toFixed(2)}% APY</div></div>
            <div><div className="text-muted-foreground text-[10px] uppercase">Principal</div>${s.amount.toFixed(2)}</div>
            <div><div className="text-muted-foreground text-[10px] uppercase">Lock</div>{s.lock_days === 0 ? "Flexible" : `${s.lock_days}d`}</div>
            <div><div className="text-muted-foreground text-[10px] uppercase">Accrued</div><span className="text-success">+${s.accrued_rewards.toFixed(4)}</span></div>
            <button onClick={() => onRedeem(s.id)} className="bg-white/10 hover:bg-white/20 py-2 rounded font-semibold">Redeem</button>
          </div>
        ))}
      </div>
    </div>
  );
}
