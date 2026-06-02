import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const listLeaders = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("copy_leaders").select("*").order("roi_30d", { ascending: false });
  return (data ?? []).map((l) => ({
    id: l.id,
    display_name: l.display_name,
    avatar_seed: l.avatar_seed,
    bio: l.bio ?? "",
    roi_30d: Number(l.roi_30d),
    win_rate: Number(l.win_rate),
    followers: l.followers,
    aum_usdt: Number(l.aum_usdt),
    total_pnl: Number(l.total_pnl),
    badge: l.badge,
  }));
});

const FollowInput = z.object({
  leader_id: z.string().uuid(),
  allocation_usdt: z.number().positive().max(1_000_000),
});

export const followLeader = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => FollowInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: wallet } = await supabase
      .from("wallets").select("balance_usdt").eq("user_id", userId).maybeSingle();
    const balance = Number(wallet?.balance_usdt ?? 0);
    if (balance < data.allocation_usdt) throw new Error("Insufficient balance");

    await supabase.from("wallets")
      .update({ balance_usdt: balance - data.allocation_usdt, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    const { error } = await supabase.from("copy_follows").insert({
      user_id: userId,
      leader_id: data.leader_id,
      allocation_usdt: data.allocation_usdt,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

const UnfollowInput = z.object({ follow_id: z.string().uuid() });

export const unfollowLeader = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UnfollowInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: f } = await supabase
      .from("copy_follows").select("*")
      .eq("id", data.follow_id).eq("user_id", userId).maybeSingle();
    if (!f || f.status !== "active") throw new Error("Not active");

    const returned = Math.max(0, Number(f.allocation_usdt) + Number(f.current_pnl));
    const { data: wallet } = await supabase
      .from("wallets").select("balance_usdt").eq("user_id", userId).maybeSingle();
    const balance = Number(wallet?.balance_usdt ?? 0);

    await supabase.from("wallets")
      .update({ balance_usdt: balance + returned, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    await supabase.from("copy_follows")
      .update({ status: "stopped", stopped_at: new Date().toISOString() })
      .eq("id", data.follow_id);
    return { success: true };
  });

export const listMyFollows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("copy_follows")
      .select("id, leader_id, allocation_usdt, current_pnl, status, started_at, copy_leaders(display_name, avatar_seed, roi_30d)")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });
    return (data ?? []).map((f) => ({
      id: f.id,
      leader_id: f.leader_id,
      leader_name: (f.copy_leaders as { display_name: string } | null)?.display_name ?? "",
      avatar_seed: (f.copy_leaders as { avatar_seed: string } | null)?.avatar_seed ?? "",
      roi_30d: Number((f.copy_leaders as { roi_30d: number } | null)?.roi_30d ?? 0),
      allocation_usdt: Number(f.allocation_usdt),
      current_pnl: Number(f.current_pnl),
      status: f.status,
      started_at: f.started_at,
    }));
  });
