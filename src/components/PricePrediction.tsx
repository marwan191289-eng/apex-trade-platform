import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { TrendingUp, TrendingDown, Minus, Sparkles, Activity, Brain } from "lucide-react";
import { useIndicators } from "@/lib/indicators";
import { useLivePrice } from "@/lib/live-prices";
import { getPricePrediction, type Prediction } from "@/lib/predictions.functions";
import { fmtPrice, fmtPct } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";

interface Props {
  symbol: string; // e.g. "BTC"
  changePct24h?: number;
}

export function PricePrediction({ symbol, changePct24h = 0 }: Props) {
  const { user } = useAuth();
  const { indicators } = useIndicators(symbol, "1m");
  const live = useLivePrice(symbol);
  const price = live?.price;
  const predict = useServerFn(getPricePrediction);
  const [pred, setPred] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!indicators || !price || !user) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const p = await predict({
          data: {
            symbol: symbol.toUpperCase(),
            price,
            rsi: indicators.rsi,
            momentum: indicators.momentum,
            atrPct: indicators.atrPct,
            volDelta: indicators.volDelta,
            signal: indicators.signal,
            ema9: indicators.ema9,
            ema21: indicators.ema21,
            ema50: indicators.ema50,
            high20: indicators.high20,
            low20: indicators.low20,
            changePct24h,
          },
        });
        if (!cancelled) { setPred(p); setUpdatedAt(Date.now()); }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    };

    run();
    const t = window.setInterval(run, 60_000); // refresh every 60s
    return () => { cancelled = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, indicators?.signal.toFixed(0), price ? Math.floor(price) : 0]);

  if (!indicators) {
    return (
      <div className="bg-bg-card border border-white/5 rounded-lg p-5">
        <div className="text-xs text-muted-foreground">Loading market intelligence…</div>
      </div>
    );
  }

  const dir = pred?.direction ?? (indicators.signal > 15 ? "up" : indicators.signal < -15 ? "down" : "flat");
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  const color = dir === "up" ? "text-success" : dir === "down" ? "text-danger" : "text-muted-foreground";
  const bgColor = dir === "up" ? "from-success/10" : dir === "down" ? "from-danger/10" : "from-muted/10";
  const conf = pred?.confidence ?? Math.round(Math.min(95, Math.abs(indicators.signal) + 30) * 0.7);
  const target = pred?.targetPrice ?? indicators.lastClose;
  const support = pred?.support ?? indicators.low20;
  const resistance = pred?.resistance ?? indicators.high20;
  const expectedMovePct = price ? ((target - price) / price) * 100 : 0;

  return (
    <div className={`bg-gradient-to-br ${bgColor} to-bg-card border border-white/5 rounded-lg p-5 space-y-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded ${dir === "up" ? "bg-success/20" : dir === "down" ? "bg-danger/20" : "bg-white/5"}`}>
            <Brain className={`w-4 h-4 ${color}`} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              AI Prediction <Sparkles className="w-3 h-3" />
            </div>
            <div className="text-xs text-muted-foreground">Next 10 minutes • {pred?.source === "ai" ? "AI + Statistical" : "Statistical"}</div>
          </div>
        </div>
        {loading && <div className="text-[10px] text-muted-foreground animate-pulse">analyzing…</div>}
      </div>

      {/* Main prediction */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-8 h-8 ${color}`} />
          <div>
            <div className={`text-2xl font-bold ${color} uppercase`}>
              {dir === "up" ? "صعود" : dir === "down" ? "هبوط" : "محايد"}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Target ${fmtPrice(target)} ({fmtPct(expectedMovePct)})
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold font-mono">{conf}%</div>
          <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-700 ${dir === "up" ? "bg-success" : dir === "down" ? "bg-danger" : "bg-muted-foreground"}`}
          style={{ width: `${conf}%` }}
        />
      </div>

      {/* Reasoning */}
      {pred?.reasoning && (
        <div className="text-xs text-muted-foreground leading-relaxed border-l-2 border-white/10 pl-3" dir="auto">
          {pred.reasoning}
        </div>
      )}

      {/* S/R levels */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-bg-main/50 rounded p-2 border border-success/20">
          <div className="text-[10px] text-muted-foreground uppercase">Support</div>
          <div className="text-success">${fmtPrice(support)}</div>
        </div>
        <div className="bg-bg-main/50 rounded p-2 border border-danger/20">
          <div className="text-[10px] text-muted-foreground uppercase">Resistance</div>
          <div className="text-danger">${fmtPrice(resistance)}</div>
        </div>
      </div>

      {/* Live indicators */}
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
          <Activity className="w-3 h-3" /> Live Indicators
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs font-mono">
          <Stat label="RSI" value={indicators.rsi.toFixed(0)} cls={indicators.rsi > 70 ? "text-danger" : indicators.rsi < 30 ? "text-success" : ""} />
          <Stat label="MOM%" value={indicators.momentum.toFixed(2)} cls={indicators.momentum >= 0 ? "text-success" : "text-danger"} />
          <Stat label="ATR%" value={indicators.atrPct.toFixed(2)} />
          <Stat label="Vol Δ" value={(indicators.volDelta * 100).toFixed(0)} cls={indicators.volDelta >= 0 ? "text-success" : "text-danger"} />
        </div>
      </div>

      {updatedAt && (
        <div className="text-[10px] text-muted-foreground text-right">
          Updated {Math.floor((Date.now() - updatedAt) / 1000)}s ago • refresh 60s
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="bg-bg-main/50 rounded p-1.5 text-center">
      <div className="text-[9px] text-muted-foreground uppercase">{label}</div>
      <div className={cls}>{value}</div>
    </div>
  );
}
