import { useEffect, useRef } from "react";

interface Props {
  symbol: string; // e.g. "BTC"
  height?: number;
}

declare global {
  interface Window { TradingView?: { widget: new (cfg: Record<string, unknown>) => unknown } }
}

/**
 * Full TradingView Advanced Chart — all indicators, drawing tools, timeframes,
 * compare, save image, etc. Loaded via the official tv.js embed.
 */
export function CandlestickChart({ symbol, height = 560 }: Props) {
  const containerId = useRef(`tv_${Math.random().toString(36).slice(2)}`);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const mount = () => {
      if (cancelled || !window.TradingView || !ref.current) return;
      ref.current.innerHTML = "";
      const inner = document.createElement("div");
      inner.id = containerId.current;
      inner.style.height = "100%";
      inner.style.width = "100%";
      ref.current.appendChild(inner);
      new window.TradingView.widget({
        container_id: containerId.current,
        symbol: `BINANCE:${symbol.toUpperCase()}USDT`,
        interval: "60",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        autosize: true,
        toolbar_bg: "#0b0e14",
        enable_publishing: false,
        withdateranges: true,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        details: true,
        hotlist: true,
        calendar: true,
        studies: ["MASimple@tv-basicstudies", "RSI@tv-basicstudies", "MACD@tv-basicstudies"],
        show_popup_button: true,
        popup_width: "1000",
        popup_height: "650",
      });
    };

    if (window.TradingView) {
      mount();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-tv-loader="1"]');
      if (existing) {
        existing.addEventListener("load", mount, { once: true });
      } else {
        const s = document.createElement("script");
        s.src = "https://s3.tradingview.com/tv.js";
        s.async = true;
        s.dataset.tvLoader = "1";
        s.onload = mount;
        document.head.appendChild(s);
      }
    }
    return () => { cancelled = true; };
  }, [symbol]);

  return (
    <div className="bg-bg-card border border-white/5 rounded-lg overflow-hidden">
      <div ref={ref} style={{ height }} className="w-full" />
    </div>
  );
}
