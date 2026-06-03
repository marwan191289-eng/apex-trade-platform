import { Link } from "@tanstack/react-router";
import type { MarketCoin } from "@/lib/coingecko";
import { fmtPrice, fmtPct, fmtCompact } from "@/lib/format";
import { Sparkline } from "./Sparkline";
import { useI18n } from "@/lib/i18n";
import { useLivePrices } from "@/lib/live-prices";
import { LivePriceCell } from "./LivePriceCell";

export function MarketsTable({ coins, limit }: { coins: MarketCoin[]; limit?: number }) {
  const { t } = useI18n();
  const shown = limit ? coins.slice(0, limit) : coins;

  return (
    <div className="bg-bg-card rounded-lg overflow-hidden border border-white/5">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir="ltr">
          <thead className="text-muted-foreground text-[11px] border-b border-white/5">
            <tr>
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">{t("markets.col.asset")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("markets.col.price")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("markets.col.change")}</th>
              <th className="px-4 py-3 text-right font-medium hidden md:table-cell">{t("markets.col.volume")}</th>
              <th className="px-4 py-3 text-right font-medium hidden lg:table-cell">{t("markets.col.mcap")}</th>
              <th className="px-4 py-3 text-right font-medium hidden md:table-cell">{t("markets.col.chart")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("markets.col.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {shown.map((c) => {
              const up = (c.price_change_percentage_24h ?? 0) >= 0;
              return (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-4 text-muted-foreground text-xs">{c.market_cap_rank}</td>
                  <td className="px-4 py-4">
                    <Link to="/trade/$symbol" params={{ symbol: c.symbol.toUpperCase() }} className="flex items-center gap-2.5 group">
                      <img src={c.image} alt="" width={24} height={24} className="rounded-full" />
                      <span className="font-semibold group-hover:text-accent transition-colors">{c.name}</span>
                      <span className="text-muted-foreground text-xs uppercase">{c.symbol}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-right font-mono">${fmtPrice(c.current_price)}</td>
                  <td className={`px-4 py-4 text-right font-mono ${up ? "text-success" : "text-danger"}`}>{fmtPct(c.price_change_percentage_24h)}</td>
                  <td className="px-4 py-4 text-right text-muted-foreground hidden md:table-cell font-mono">{fmtCompact(c.total_volume)}</td>
                  <td className="px-4 py-4 text-right text-muted-foreground hidden lg:table-cell font-mono">{fmtCompact(c.market_cap)}</td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="flex justify-end">
                      <Sparkline data={c.sparkline_in_7d?.price ?? []} positive={up} />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link to="/trade/$symbol" params={{ symbol: c.symbol.toUpperCase() }} className="text-accent text-xs font-semibold hover:underline">
                      {t("markets.action.trade")}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
