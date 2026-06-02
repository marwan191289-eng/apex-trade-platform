import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const OpenInput = z.object({
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/),
  side: z.enum(["long", "short"]),
  margin_usdt: z.number().positive().max(1_000_000),
  leverage: z.number().int().min(1).max(125),
  entry_price: z.number().positive(),
});

export const openFuturesPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => OpenInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: wallet } = await supabase
      .from("wallets").select("balance_usdt").eq("user_id", userId).maybeSingle();
    if (!wallet) throw new Error("Wallet not found");
    const balance = Number(wallet.balance_usdt);
    if (balance < data.margin_usdt) throw new Error("Insufficient margin");

    const size = data.margin_usdt * data.leverage;
    // simplified liquidation: long → entry * (1 - 1/lev * 0.95); short → entry * (1 + 1/lev * 0.95)
    const buffer = 0.95 / data.leverage;
    const liq =
      data.side === "long"
        ? data.entry_price * (1 - buffer)
        : data.entry_price * (1 + buffer);

    await supabase
      .from("wallets")
      .update({ balance_usdt: balance - data.margin_usdt, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    const { error } = await supabase.from("futures_positions").insert({
      user_id: userId,
      symbol: data.symbol,
      side: data.side,
      leverage: data.leverage,
      entry_price: data.entry_price,
      size_usdt: size,
      margin_usdt: data.margin_usdt,
      liquidation_price: liq,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

const CloseInput = z.object({
  position_id: z.string().uuid(),
  exit_price: z.number().positive(),
});

export const closeFuturesPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CloseInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: pos } = await supabase
      .from("futures_positions").select("*")
      .eq("id", data.position_id).eq("user_id", userId).maybeSingle();
    if (!pos || pos.status !== "open") throw new Error("Position not open");

    const entry = Number(pos.entry_price);
    const size = Number(pos.size_usdt);
    const margin = Number(pos.margin_usdt);
    const qty = size / entry;
    const pnl =
      pos.side === "long"
        ? (data.exit_price - entry) * qty
        : (entry - data.exit_price) * qty;

    const returned = Math.max(0, margin + pnl);

    const { data: wallet } = await supabase
      .from("wallets").select("balance_usdt").eq("user_id", userId).maybeSingle();
    const balance = Number(wallet?.balance_usdt ?? 0);

    await supabase
      .from("wallets")
      .update({ balance_usdt: balance + returned, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    await supabase
      .from("futures_positions")
      .update({
        status: "closed",
        close_price: data.exit_price,
        realized_pnl: pnl,
        closed_at: new Date().toISOString(),
      })
      .eq("id", data.position_id);

    return { success: true, pnl };
  });

export const listFuturesPositions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("futures_positions").select("*")
      .eq("user_id", userId).order("opened_at", { ascending: false }).limit(100);
    return (data ?? []).map((p) => ({
      id: p.id,
      symbol: p.symbol,
      side: p.side as "long" | "short",
      leverage: p.leverage,
      entry_price: Number(p.entry_price),
      size_usdt: Number(p.size_usdt),
      margin_usdt: Number(p.margin_usdt),
      liquidation_price: Number(p.liquidation_price),
      status: p.status,
      close_price: p.close_price !== null ? Number(p.close_price) : null,
      realized_pnl: p.realized_pnl !== null ? Number(p.realized_pnl) : null,
      opened_at: p.opened_at,
    }));
  });
