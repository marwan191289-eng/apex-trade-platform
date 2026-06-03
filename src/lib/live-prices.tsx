import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// Live tick from Binance !miniTicker@arr stream (~1s updates for all symbols)
export interface LiveTick {
  price: number;
  open: number; // 24h open
  high: number;
  low: number;
  volume: number; // base asset volume
  changePct: number; // 24h % change derived from open
}

type LiveMap = Record<string, LiveTick>; // key: lowercase base symbol (e.g. "btc")

const LivePricesContext = createContext<LiveMap>({});

export function LivePricesProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<LiveMap>({});
  const bufferRef = useRef<LiveMap>({});
  const flushRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let closed = false;

    const flush = () => {
      flushRef.current = null;
      if (Object.keys(bufferRef.current).length === 0) return;
      setMap((prev) => ({ ...prev, ...bufferRef.current }));
      bufferRef.current = {};
    };

    const connect = () => {
      try {
        ws = new WebSocket("wss://stream.binance.com:9443/ws/!miniTicker@arr");
      } catch {
        scheduleReconnect();
        return;
      }
      ws.onmessage = (ev) => {
        try {
          const arr = JSON.parse(ev.data) as Array<{
            s: string; c: string; o: string; h: string; l: string; v: string;
          }>;
          for (const t of arr) {
            if (!t.s.endsWith("USDT")) continue;
            const base = t.s.slice(0, -4).toLowerCase();
            const price = parseFloat(t.c);
            const open = parseFloat(t.o);
            bufferRef.current[base] = {
              price,
              open,
              high: parseFloat(t.h),
              low: parseFloat(t.l),
              volume: parseFloat(t.v),
              changePct: open > 0 ? ((price - open) / open) * 100 : 0,
            };
          }
          if (flushRef.current === null) {
            flushRef.current = window.setTimeout(flush, 800);
          }
        } catch {
          /* ignore parse errors */
        }
      };
      ws.onclose = () => { if (!closed) scheduleReconnect(); };
      ws.onerror = () => { try { ws?.close(); } catch { /* noop */ } };
    };

    const scheduleReconnect = () => {
      if (reconnectTimer !== null) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 3000);
    };

    connect();

    return () => {
      closed = true;
      if (flushRef.current !== null) { clearTimeout(flushRef.current); flushRef.current = null; }
      if (reconnectTimer !== null) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      try { ws?.close(); } catch { /* noop */ }
    };
  }, []);

  return <LivePricesContext.Provider value={map}>{children}</LivePricesContext.Provider>;
}

export function useLivePrices() {
  return useContext(LivePricesContext);
}

export function useLivePrice(symbol: string | undefined): LiveTick | undefined {
  const map = useLivePrices();
  if (!symbol) return undefined;
  return map[symbol.toLowerCase()];
}
