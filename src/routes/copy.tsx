import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useMemo, useState } from "react";
import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { listLeaders, followLeader, unfollowLeader, listMyFollows } from "@/lib/copy.functions";
import { fmtUsd } from "@/lib/format";

const leadersQuery = queryOptions({ queryKey: ["copy-leaders"], queryFn: () => listLeaders(), staleTime: 60_000 });
const followsQuery = queryOptions({ queryKey: ["copy-follows"], queryFn: () => listMyFollows(), staleTime: 5_000 });

export const Route = createFileRoute("/copy")({
  head: () => ({ meta: [
    { title: "Copy Trading — TradeXray" },
    { name: "description", content: "Follow verified pro crypto traders and mirror their trades automatically with copy trading on TradeXray." },
    { property: "og:title", content: "Copy Trading — Mirror Pro Traders on TradeXray" },
    { property: "og:description", content: "Browse leaderboards, ROI and win-rates. Follow top traders and auto-copy their positions." },
    { property: "og:image", content: "https://tradexray-v.lovable.app/og-image.jpg" },
    { property: "og:url", content: "https://tradexray-v.lovable.app/copy" },
  ], links: [{ rel: "canonical", href: "https://tradexray-v.lovable.app/copy" }] }),
  errorComponent: ({ error }) => <div className="p-8 text-danger">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: CopyPage,
});


function CopyPage() {
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

function Avatar({ seed, size = 48 }: { seed: string; size?: number }) {
  return <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${seed}`} alt="" width={size} height={size} className="rounded-full bg-bg-main ring-2 ring-white/5" />;
}

type Leader = { id: string; display_name: string; avatar_seed: string; bio: string; roi_30d: number; win_rate: number; followers: number; aum_usdt: number; badge: string | null };
type SortKey = "roi" | "winrate" | "followers" | "aum";

function Content() {
  const { data: leaders } = useSuspenseQuery(leadersQuery);
  const { data: mine } = useSuspenseQuery(followsQuery);
  const activeMine = mine.filter((f) => f.status === "active");
  const [sort, setSort] = useState<SortKey>("roi");
  const [q, setQ] = useState("");

  const totalAllocated = activeMine.reduce((s, f) => s + f.allocation_usdt, 0);
  const totalPnl = activeMine.reduce((s, f) => s + f.current_pnl, 0);

  const sorted = useMemo(() => {
    let list = leaders;
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((l) => l.display_name.toLowerCase().includes(s));
    return [...list].sort((a, b) => {
      if (sort === "roi") return b.roi_30d - a.roi_30d;
      if (sort === "winrate") return b.win_rate - a.win_rate;
      if (sort === "followers") return b.followers - a.followers;
      return b.aum_usdt - a.aum_usdt;
    });
  }, [leaders, sort, q]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-1">Copy Trading</h1>
        <p className="text-muted-foreground text-sm">Allocate capital to verified traders. Every trade they make is mirrored proportionally to your portfolio.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Following" value={String(activeMine.length)} />
        <StatCard label="Allocated" value={fmtUsd(totalAllocated)} />
        <StatCard label="Total P&L" value={fmtUsd(totalPnl)} accent={totalPnl >= 0 ? "success" : "danger"} />
        <StatCard label="Available Traders" value={String(leaders.length)} />
      </div>

      {activeMine.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-bold mb-3 text-muted-foreground uppercase tracking-widest">My Active Subscriptions</h2>
          <MineList />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Top Traders</h2>
        <div className="flex gap-2 items-center">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search trader…" className="bg-bg-card border border-white/10 rounded-md px-3 py-1.5 text-xs w-48 focus:outline-none focus:border-accent" />
          <div className="flex gap-1 bg-bg-card border border-white/5 rounded-md p-0.5 text-[11px]">
            {(["roi", "winrate", "followers", "aum"] as SortKey[]).map((k) => (
              <button key={k} onClick={() => setSort(k)} className={`px-2.5 py-1 rounded uppercase font-semibold ${sort === k ? "bg-accent text-bg-main" : "text-muted-foreground"}`}>{k}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((l, i) => <LeaderCard key={l.id} leader={l} rank={i + 1} />)}
      </div>
    </>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: "success" | "danger" }) {
  return (
    <div className="bg-bg-card border border-white/5 rounded-lg p-4">
      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">{label}</div>
      <div className={`text-xl font-bold font-mono ${accent === "success" ? "text-success" : accent === "danger" ? "text-danger" : ""}`}>{value}</div>
    </div>
  );
}

// Deterministic synthetic equity curve from leader seed
function EquityCurve({ seed, positive }: { seed: string; positive: boolean }) {
  const points = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
    const rng = () => { h = (h * 9301 + 49297) % 233280; return h / 233280; };
    const pts: number[] = [];
    let v = 50;
    const trend = positive ? 0.6 : -0.4;
    for (let i = 0; i < 30; i++) { v += (rng() - 0.5) * 8 + trend; pts.push(v); }
    return pts;
  }, [seed, positive]);
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i / (points.length - 1)) * 100},${100 - ((p - min) / range) * 100}`).join(" ");
  const color = positive ? "#10b981" : "#ef4444";
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-12">
      <defs><linearGradient id={`g-${seed}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.4" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L100,100 L0,100 Z`} fill={`url(#g-${seed})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function RiskBadge({ winRate, roi }: { winRate: number; roi: number }) {
  const risk = roi > 50 ? "High" : roi > 20 ? "Medium" : "Low";
  const color = risk === "Low" ? "text-success bg-success/10" : risk === "Medium" ? "text-amber-400 bg-amber-400/10" : "text-danger bg-danger/10";
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${color}`}>{risk} Risk</span>;
}

function LeaderCard({ leader, rank }: { leader: Leader; rank: number }) {
  const follow = useServerFn(followLeader);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [alloc, setAlloc] = useState(200);

  const submit = async () => {
    try {
      await follow({ data: { leader_id: leader.id, allocation_usdt: alloc } });
      toast.success(`Now copying ${leader.display_name}`);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["copy-follows"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="bg-bg-card border border-white/5 rounded-xl p-5 flex flex-col hover:border-accent/30 transition relative overflow-hidden">
      {rank <= 3 && <span className="absolute top-3 right-3 text-[10px] font-bold bg-gradient-to-r from-amber-400 to-amber-600 text-bg-main px-2 py-0.5 rounded">#{rank}</span>}

      <div className="flex items-center gap-3 mb-3">
        <Avatar seed={leader.avatar_seed} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-bold truncate">{leader.display_name}</div>
            {leader.badge && <span className="text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded uppercase">{leader.badge}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{leader.followers.toLocaleString()} followers</span>
            <RiskBadge winRate={leader.win_rate} roi={leader.roi_30d} />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2 min-h-[2rem]">{leader.bio}</p>

      <EquityCurve seed={leader.avatar_seed} positive={leader.roi_30d >= 0} />

      <div className="grid grid-cols-3 gap-2 my-3 text-center">
        <div className="bg-bg-main rounded-lg p-2">
          <div className="text-[9px] text-muted-foreground uppercase">ROI 30D</div>
          <div className={`font-mono font-bold ${leader.roi_30d >= 0 ? "text-success" : "text-danger"}`}>{leader.roi_30d >= 0 ? "+" : ""}{leader.roi_30d.toFixed(1)}%</div>
        </div>
        <div className="bg-bg-main rounded-lg p-2">
          <div className="text-[9px] text-muted-foreground uppercase">Win Rate</div>
          <div className="font-mono font-bold">{leader.win_rate.toFixed(1)}%</div>
        </div>
        <div className="bg-bg-main rounded-lg p-2">
          <div className="text-[9px] text-muted-foreground uppercase">AUM</div>
          <div className="font-mono font-bold">${(leader.aum_usdt / 1_000_000).toFixed(1)}M</div>
        </div>
      </div>

      {open ? (
        <div className="space-y-2 mt-auto">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase block mb-1">Allocation (USDT)</label>
            <input type="number" value={alloc} onChange={(e) => setAlloc(+e.target.value || 0)} className="w-full bg-bg-main border border-white/10 rounded p-2 text-sm font-mono focus:outline-none focus:border-accent" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={submit} className="bg-accent text-bg-main py-2 rounded font-bold text-sm">Confirm</button>
            <button onClick={() => setOpen(false)} className="bg-white/5 py-2 rounded text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="bg-accent text-bg-main py-2.5 rounded-lg font-bold text-sm hover:brightness-110 mt-auto transition">Copy Trader</button>
      )}
    </div>
  );
}

function MineList() {
  const { data: mine } = useSuspenseQuery(followsQuery);
  const unfollow = useServerFn(unfollowLeader);
  const qc = useQueryClient();
  const onStop = async (id: string) => {
    try {
      await unfollow({ data: { follow_id: id } });
      toast.success("Stopped copying");
      qc.invalidateQueries({ queryKey: ["copy-follows"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {mine.filter((f) => f.status === "active").map((f) => {
        const pnlPct = f.allocation_usdt > 0 ? (f.current_pnl / f.allocation_usdt) * 100 : 0;
        const up = f.current_pnl >= 0;
        return (
          <div key={f.id} className="bg-bg-card border border-white/5 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar seed={f.avatar_seed} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{f.leader_name}</div>
                <div className="text-[10px] text-success">+{f.roi_30d.toFixed(1)}% (30D)</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono mb-3">
              <div><div className="text-[9px] text-muted-foreground uppercase">Allocated</div>${f.allocation_usdt.toFixed(0)}</div>
              <div><div className="text-[9px] text-muted-foreground uppercase">P&L</div><span className={up ? "text-success" : "text-danger"}>{up ? "+" : ""}${f.current_pnl.toFixed(2)}</span></div>
              <div><div className="text-[9px] text-muted-foreground uppercase">ROI</div><span className={up ? "text-success" : "text-danger"}>{up ? "+" : ""}{pnlPct.toFixed(2)}%</span></div>
            </div>
            <button onClick={() => onStop(f.id)} className="w-full bg-danger/10 hover:bg-danger/20 text-danger py-2 rounded font-semibold text-xs">Stop Copying</button>
          </div>
        );
      })}
    </div>
  );
}
