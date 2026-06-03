import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { listLeaders, followLeader, unfollowLeader, listMyFollows } from "@/lib/copy.functions";

const leadersQuery = queryOptions({ queryKey: ["copy-leaders"], queryFn: () => listLeaders(), staleTime: 60_000 });
const followsQuery = queryOptions({ queryKey: ["copy-follows"], queryFn: () => listMyFollows(), staleTime: 5_000 });

export const Route = createFileRoute("/copy")({
  head: () => ({ meta: [{ title: "Copy Trading — TradeXray" }, { name: "description", content: "Follow top traders and mirror their trades automatically." }] }),
  errorComponent: ({ error }) => <div className="p-8 text-danger">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: CopyPage,
});

function CopyPage() {
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

function Avatar({ seed }: { seed: string }) {
  return <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${seed}`} alt="" width={48} height={48} className="rounded-full bg-bg-main" />;
}

function Content() {
  const { data: leaders } = useSuspenseQuery(leadersQuery);
  const { data: mine } = useSuspenseQuery(followsQuery);
  const activeMine = mine.filter((f) => f.status === "active");

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-1">Copy Trading</h1>
        <p className="text-muted-foreground text-sm">Allocate funds to top traders. Their trades are mirrored proportionally to your portfolio.</p>
      </div>

      {activeMine.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">My Subscriptions</h2>
          <MineList />
        </div>
      )}

      <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Top Traders ({leaders.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leaders.map((l) => <LeaderCard key={l.id} leader={l} />)}
      </div>
    </>
  );
}

function LeaderCard({ leader }: { leader: { id: string; display_name: string; avatar_seed: string; bio: string; roi_30d: number; win_rate: number; followers: number; aum_usdt: number; badge: string | null } }) {
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
    <div className="bg-bg-card border border-white/5 rounded-lg p-5 flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <Avatar seed={leader.avatar_seed} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-bold">{leader.display_name}</div>
            {leader.badge && <span className="text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded">{leader.badge}</span>}
          </div>
          <div className="text-[10px] text-muted-foreground">{leader.followers.toLocaleString()} followers</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{leader.bio}</p>
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div><div className="text-[10px] text-muted-foreground uppercase">ROI 30D</div><div className="font-mono text-success font-bold">+{leader.roi_30d.toFixed(1)}%</div></div>
        <div><div className="text-[10px] text-muted-foreground uppercase">Win Rate</div><div className="font-mono font-bold">{leader.win_rate.toFixed(1)}%</div></div>
        <div><div className="text-[10px] text-muted-foreground uppercase">AUM</div><div className="font-mono font-bold">${(leader.aum_usdt / 1_000_000).toFixed(1)}M</div></div>
      </div>
      {open ? (
        <div className="space-y-2">
          <input type="number" value={alloc} onChange={(e) => setAlloc(+e.target.value || 0)} className="w-full bg-bg-main border border-white/10 rounded p-2 text-sm font-mono" placeholder="USDT amount" />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={submit} className="bg-accent text-bg-main py-2 rounded font-bold text-sm">Confirm</button>
            <button onClick={() => setOpen(false)} className="bg-white/5 py-2 rounded text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="bg-accent text-bg-main py-2.5 rounded font-bold text-sm hover:brightness-110 mt-auto">Copy Trader</button>
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
    <div className="space-y-2">
      {mine.filter((f) => f.status === "active").map((f) => (
        <div key={f.id} className="bg-bg-card border border-white/5 rounded-lg p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-center text-xs font-mono">
          <div className="flex items-center gap-3"><Avatar seed={f.avatar_seed} /><div className="font-bold text-sm">{f.leader_name}</div></div>
          <div><div className="text-muted-foreground text-[10px] uppercase">Allocation</div>${f.allocation_usdt.toFixed(2)}</div>
          <div><div className="text-muted-foreground text-[10px] uppercase">Leader ROI 30D</div><span className="text-success">+{f.roi_30d.toFixed(1)}%</span></div>
          <div><div className="text-muted-foreground text-[10px] uppercase">PnL</div><span className={f.current_pnl >= 0 ? "text-success" : "text-danger"}>{f.current_pnl >= 0 ? "+" : ""}${f.current_pnl.toFixed(2)}</span></div>
          <button onClick={() => onStop(f.id)} className="bg-danger/20 text-danger hover:bg-danger/30 py-2 rounded font-semibold">Stop</button>
        </div>
      ))}
    </div>
  );
}
