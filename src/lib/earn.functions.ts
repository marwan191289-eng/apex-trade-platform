import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const listStakingProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("staking_products").select("*").order("apy", { ascending: false });
  return (data ?? []).map((p) => ({
    id: p.id,
    asset_symbol: p.asset_symbol,
    apy: Number(p.apy),
    lock_days: p.lock_days,
    min_amount: Number(p.min_amount),
    is_flexible: p.is_flexible,
    badge: p.badge,
  }));
});

const StakeInput = z.object({
  product_id: z.string().uuid(),
  amount_usdt: z.number().positive().max(1_000_000),
});

export const stake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => StakeInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: wallet } = await supabase
      .from("wallets").select("balance_usdt").eq("user_id", userId).maybeSingle();
    const balance = Number(wallet?.balance_usdt ?? 0);
    if (balance < data.amount_usdt) throw new Error("Insufficient balance");

    await supabase.from("wallets")
      .update({ balance_usdt: balance - data.amount_usdt, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    const { error } = await supabase.from("stakes").insert({
      user_id: userId,
      product_id: data.product_id,
      amount: data.amount_usdt,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

const RedeemInput = z.object({ stake_id: z.string().uuid() });

export const redeem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => RedeemInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: s } = await supabase
      .from("stakes")
      .select("*, staking_products(apy)")
      .eq("id", data.stake_id).eq("user_id", userId).maybeSingle();
    if (!s || s.status !== "active") throw new Error("Not active");

    const principal = Number(s.amount);
    const apy = Number((s.staking_products as { apy: number } | null)?.apy ?? 0);
    const startedAt = new Date(s.started_at).getTime();
    const days = Math.max(0, (Date.now() - startedAt) / 86_400_000);
    const rewards = principal * (apy / 100) * (days / 365);
    const returned = principal + rewards;

    const { data: wallet } = await supabase
      .from("wallets").select("balance_usdt").eq("user_id", userId).maybeSingle();
    const balance = Number(wallet?.balance_usdt ?? 0);
    await supabase.from("wallets")
      .update({ balance_usdt: balance + returned, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    await supabase.from("stakes")
      .update({ status: "redeemed", redeemed_at: new Date().toISOString(), rewards_accumulated: rewards })
      .eq("id", data.stake_id);
    return { success: true, rewards };
  });

export const listMyStakes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("stakes")
      .select("id, amount, status, started_at, staking_products(asset_symbol, apy, lock_days)")
      .eq("user_id", userId).order("started_at", { ascending: false });
    return (data ?? []).map((s) => {
      const product = s.staking_products as { asset_symbol: string; apy: number; lock_days: number } | null;
      const apy = Number(product?.apy ?? 0);
      const principal = Number(s.amount);
      const days = (Date.now() - new Date(s.started_at).getTime()) / 86_400_000;
      const accrued = principal * (apy / 100) * (days / 365);
      return {
        id: s.id,
        asset_symbol: product?.asset_symbol ?? "",
        apy,
        lock_days: product?.lock_days ?? 0,
        amount: principal,
        accrued_rewards: accrued,
        status: s.status,
        started_at: s.started_at,
      };
    });
  });
