import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { executeTrade } from "@/lib/trading.functions";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { fmtPrice } from "@/lib/format";
import { portfolioQuery } from "@/lib/portfolio-query";

export function TradePanel({ symbol, price }: { symbol: string; price: number }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState(price.toString());
  const qc = useQueryClient();
  const trade = useServerFn(executeTrade);

  // Portfolio query only when logged in
  const portfolio = useQuery({ ...portfolioQuery, enabled: !!user });
  const holding = portfolio.data?.holdings.find((h) => h.symbol === symbol.toUpperCase());
  const balance = portfolio.data?.balance ?? 0;

  const m = useMutation({
    mutationFn: trade,
    onSuccess: () => {
      toast.success(side === "buy" ? t("trade.success.buy") : t("trade.success.sell"));
      setAmount("");
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const numAmount = parseFloat(amount) || 0;
  const numPrice = parseFloat(limitPrice) || price;
  const total = numAmount * numPrice;

  const setPct = (pct: number) => {
    if (side === "buy") {
      const usable = (balance * pct) / 100;
      setAmount((usable / numPrice).toFixed(6));
    } else {
      const have = holding?.amount ?? 0;
      setAmount(((have * pct) / 100).toFixed(6));
    }
  };

  const onSubmit = () => {
    if (!user || numAmount <= 0) return;
    m.mutate({ data: { symbol: symbol.toUpperCase(), side, amount: numAmount, price: numPrice } });
  };

  return (
    <div className="bg-bg-card rounded-lg p-4">
      <div className="flex gap-1 bg-bg-main p-1 rounded mb-5">
        <button
          onClick={() => setSide("buy")}
          className={`flex-1 py-2 text-xs font-bold rounded transition-all ${side === "buy" ? "bg-success text-white" : "text-muted-foreground hover:text-foreground"}`}
        >
          {t("trade.buy")}
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`flex-1 py-2 text-xs font-bold rounded transition-all ${side === "sell" ? "bg-danger text-white" : "text-muted-foreground hover:text-foreground"}`}
        >
          {t("trade.sell")}
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1 uppercase tracking-wider">{t("trade.price")}</label>
          <div className="relative">
            <input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="w-full bg-bg-main border border-white/10 rounded p-2 text-sm font-mono focus:border-accent outline-none"
              dir="ltr"
            />
            <span className="absolute right-3 top-2 text-xs text-muted-foreground">USDT</span>
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-1 uppercase tracking-wider">{t("trade.amount")}</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-bg-main border border-white/10 rounded p-2 text-sm font-mono focus:border-accent outline-none"
              dir="ltr"
            />
            <span className="absolute right-3 top-2 text-xs text-muted-foreground">{symbol}</span>
          </div>
        </div>

        <div className="flex gap-1">
          {[25, 50, 75, 100].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPct(p)}
              disabled={!user}
              className="flex-1 bg-bg-main text-[10px] py-1.5 rounded hover:bg-bg-elevated transition-colors text-muted-foreground disabled:opacity-40"
            >
              {p}%
            </button>
          ))}
        </div>

        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{t("trade.total")}</span>
          <span className="font-mono">${fmtPrice(total)}</span>
        </div>

        {user && (
          <div className="flex justify-between text-[11px] text-muted-foreground pt-2 border-t border-white/5">
            <span>{t("trade.available")}</span>
            <div className="text-right font-mono">
              <div>${fmtPrice(balance)} USDT</div>
              {holding && <div>{holding.amount.toFixed(6)} {symbol}</div>}
            </div>
          </div>
        )}

        {user ? (
          <button
            onClick={onSubmit}
            disabled={m.isPending || numAmount <= 0}
            className={`w-full py-3 rounded font-bold text-sm mt-2 transition-all uppercase tracking-wide disabled:opacity-50 ${
              side === "buy" ? "bg-success hover:brightness-110" : "bg-danger hover:brightness-110"
            } text-white`}
          >
            {m.isPending ? t("common.loading") : `${side === "buy" ? t("trade.execute.buy") : t("trade.execute.sell")} ${symbol}`}
          </button>
        ) : (
          <Link
            to="/login"
            className="w-full block text-center py-3 rounded font-bold text-sm mt-2 bg-accent text-bg-main hover:brightness-110 transition-all uppercase tracking-wide"
          >
            {t("trade.signin_to_trade")}
          </Link>
        )}
      </div>
    </div>
  );
}
