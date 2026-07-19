import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TradeInput = z.object({
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/),
  side: z.enum(["buy", "sell"]),
  amount: z.number().positive().finite(),
  price: z.number().positive().finite(),
});

export const executeTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TradeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const total = data.amount * data.price;

    // Get wallet
    const { data: wallet, error: wErr } = await supabase
      .from("wallets")
      .select("balance_usdt")
      .eq("user_id", userId)
      .maybeSingle();
    if (wErr) { console.error("[trading] wallet fetch", wErr.message); throw new Error("Operation failed. Please try again."); }
    if (!wallet) throw new Error("Wallet not found");

    const balance = Number(wallet.balance_usdt);

    if (data.side === "buy") {
      if (balance < total) throw new Error("Insufficient USDT balance");

      // Deduct USDT
      const { error: uErr } = await supabase
        .from("wallets")
        .update({ balance_usdt: balance - total, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (uErr) { console.error("[trading] wallet update", uErr.message); throw new Error("Operation failed. Please try again."); }

      // Upsert holding
      const { data: existing } = await supabase
        .from("holdings")
        .select("amount, avg_price")
        .eq("user_id", userId)
        .eq("asset_symbol", data.symbol)
        .maybeSingle();

      if (existing) {
        const oldAmt = Number(existing.amount);
        const oldAvg = Number(existing.avg_price);
        const newAmt = oldAmt + data.amount;
        const newAvg = newAmt > 0 ? (oldAmt * oldAvg + total) / newAmt : data.price;
        await supabase
          .from("holdings")
          .update({ amount: newAmt, avg_price: newAvg, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("asset_symbol", data.symbol);
      } else {
        await supabase.from("holdings").insert({
          user_id: userId,
          asset_symbol: data.symbol,
          amount: data.amount,
          avg_price: data.price,
        });
      }
    } else {
      // SELL
      const { data: existing } = await supabase
        .from("holdings")
        .select("amount, avg_price")
        .eq("user_id", userId)
        .eq("asset_symbol", data.symbol)
        .maybeSingle();
      if (!existing || Number(existing.amount) < data.amount) {
        throw new Error("Insufficient asset balance");
      }
      const newAmt = Number(existing.amount) - data.amount;
      await supabase
        .from("wallets")
        .update({ balance_usdt: balance + total, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (newAmt <= 0.0000001) {
        await supabase.from("holdings").delete().eq("user_id", userId).eq("asset_symbol", data.symbol);
      } else {
        await supabase
          .from("holdings")
          .update({ amount: newAmt, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("asset_symbol", data.symbol);
      }
    }

    // Record order
    const { error: oErr } = await supabase.from("orders").insert({
      user_id: userId,
      asset_symbol: data.symbol,
      side: data.side,
      order_type: "market",
      price: data.price,
      amount: data.amount,
      total_usdt: total,
      status: "filled",
    });
    if (oErr) { console.error("[trading] order insert", oErr.message); throw new Error("Operation failed. Please try again."); }

    return { success: true, symbol: data.symbol, side: data.side, total };
  });

export const getPortfolio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [w, h, o] = await Promise.all([
      supabase.from("wallets").select("balance_usdt").eq("user_id", userId).maybeSingle(),
      supabase.from("holdings").select("asset_symbol, amount, avg_price").eq("user_id", userId),
      supabase.from("orders").select("id, asset_symbol, side, price, amount, total_usdt, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    ]);
    return {
      balance: Number(w.data?.balance_usdt ?? 0),
      holdings: (h.data ?? []).map((r) => ({
        symbol: r.asset_symbol,
        amount: Number(r.amount),
        avg_price: Number(r.avg_price),
      })),
      orders: (o.data ?? []).map((r) => ({
        id: r.id,
        symbol: r.asset_symbol,
        side: r.side as "buy" | "sell",
        price: Number(r.price),
        amount: Number(r.amount),
        total: Number(r.total_usdt),
        created_at: r.created_at,
      })),
    };
  });
