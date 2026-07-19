import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GridInput = z.object({
  bot_type: z.literal("grid"),
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/),
  investment_usdt: z.number().positive().max(1_000_000),
  lower_price: z.number().positive(),
  upper_price: z.number().positive(),
  grid_count: z.number().int().min(2).max(200),
});
const DcaInput = z.object({
  bot_type: z.literal("dca"),
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/),
  investment_usdt: z.number().positive().max(1_000_000),
  per_order_usdt: z.number().positive(),
  interval_hours: z.number().int().min(1).max(720),
});
const CreateBotInput = z.discriminatedUnion("bot_type", [GridInput, DcaInput]);

export const createBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateBotInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: wallet } = await supabase
      .from("wallets").select("balance_usdt").eq("user_id", userId).maybeSingle();
    const balance = Number(wallet?.balance_usdt ?? 0);
    if (balance < data.investment_usdt) throw new Error("Insufficient balance");

    await supabase
      .from("wallets")
      .update({ balance_usdt: balance - data.investment_usdt, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    const config =
      data.bot_type === "grid"
        ? { lower_price: data.lower_price, upper_price: data.upper_price, grid_count: data.grid_count }
        : { per_order_usdt: data.per_order_usdt, interval_hours: data.interval_hours };

    const { error } = await supabase.from("bots").insert({
      user_id: userId,
      bot_type: data.bot_type,
      symbol: data.symbol,
      investment_usdt: data.investment_usdt,
      config,
    });
    if (error) { console.error("[bots]", error.message); throw new Error("Operation failed. Please try again."); }
    return { success: true };
  });

const StopInput = z.object({ bot_id: z.string().uuid() });

export const stopBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => StopInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bot } = await supabase
      .from("bots").select("*").eq("id", data.bot_id).eq("user_id", userId).maybeSingle();
    if (!bot || bot.status === "stopped") throw new Error("Bot not running");

    const inv = Number(bot.investment_usdt);
    const pnl = Number(bot.total_pnl);
    const returned = Math.max(0, inv + pnl);

    const { data: wallet } = await supabase
      .from("wallets").select("balance_usdt").eq("user_id", userId).maybeSingle();
    const balance = Number(wallet?.balance_usdt ?? 0);

    await supabase
      .from("wallets")
      .update({ balance_usdt: balance + returned, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    await supabase
      .from("bots")
      .update({ status: "stopped", stopped_at: new Date().toISOString() })
      .eq("id", data.bot_id);
    return { success: true };
  });

export const listBots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("bots").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return (data ?? []).map((b) => ({
      id: b.id,
      bot_type: b.bot_type as "grid" | "dca",
      symbol: b.symbol,
      investment_usdt: Number(b.investment_usdt),
      config: b.config as Record<string, number>,
      status: b.status as "running" | "paused" | "stopped",
      total_pnl: Number(b.total_pnl),
      total_trades: b.total_trades,
      created_at: b.created_at,
    }));
  });
