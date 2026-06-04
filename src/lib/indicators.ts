import { useEffect, useState } from "react";

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  takerBuyVolume: number;
}

export interface Indicators {
  rsi: number; // 0-100
  ema9: number;
  ema21: number;
  ema50: number;
  momentum: number; // % from ema21
  atrPct: number; // volatility %
  volDelta: number; // buy vs sell taker volume ratio -1..1
  trend: "bull" | "bear" | "neutral";
  signal: number; // -100..+100 composite statistical signal
  lastClose: number;
  high20: number;
  low20: number;
}

function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) out.push(values[i] * k + out[i - 1] * (1 - k));
  return out;
}

function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gain = 0, loss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  const avgG = gain / period, avgL = loss / period;
  if (avgL === 0) return 100;
  const rs = avgG / avgL;
  return 100 - 100 / (1 + rs);
}

function atrPct(klines: Kline[], period = 14): number {
  if (klines.length < period + 1) return 0;
  let sum = 0;
  for (let i = klines.length - period; i < klines.length; i++) {
    const k = klines[i], prev = klines[i - 1];
    const tr = Math.max(k.high - k.low, Math.abs(k.high - prev.close), Math.abs(k.low - prev.close));
    sum += tr;
  }
  const atr = sum / period;
  const last = klines[klines.length - 1].close;
  return last > 0 ? (atr / last) * 100 : 0;
}

export function computeIndicators(klines: Kline[]): Indicators | null {
  if (klines.length < 30) return null;
  const closes = klines.map((k) => k.close);
  const e9 = ema(closes, 9);
  const e21 = ema(closes, 21);
  const e50 = ema(closes, 50);
  const last = closes[closes.length - 1];
  const ema9v = e9[e9.length - 1];
  const ema21v = e21[e21.length - 1];
  const ema50v = e50[e50.length - 1];
  const momentum = ema21v > 0 ? ((last - ema21v) / ema21v) * 100 : 0;
  const rsiV = rsi(closes);
  const atr = atrPct(klines);

  // taker buy ratio over last 20 candles
  const recent = klines.slice(-20);
  const buy = recent.reduce((s, k) => s + k.takerBuyVolume, 0);
  const total = recent.reduce((s, k) => s + k.volume, 0);
  const volDelta = total > 0 ? (buy / total) * 2 - 1 : 0;

  // 20-bar high/low
  const high20 = Math.max(...recent.map((k) => k.high));
  const low20 = Math.min(...recent.map((k) => k.low));

  // Composite signal (-100..+100)
  let signal = 0;
  signal += Math.max(-30, Math.min(30, momentum * 6)); // momentum weight
  signal += (rsiV - 50) * 0.8; // RSI weight
  signal += volDelta * 25; // taker flow weight
  signal += ema9v > ema21v ? 10 : -10;
  signal += ema21v > ema50v ? 5 : -5;
  signal = Math.max(-100, Math.min(100, signal));

  const trend: "bull" | "bear" | "neutral" =
    signal > 20 ? "bull" : signal < -20 ? "bear" : "neutral";

  return {
    rsi: rsiV, ema9: ema9v, ema21: ema21v, ema50: ema50v,
    momentum, atrPct: atr, volDelta, trend, signal,
    lastClose: last, high20, low20,
  };
}

async function fetchKlines(symbol: string, interval = "1m", limit = 100): Promise<Kline[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}USDT&interval=${interval}&limit=${limit}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("klines failed");
  const arr = (await r.json()) as unknown[][];
  return arr.map((k) => ({
    openTime: k[0] as number,
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
    takerBuyVolume: parseFloat(k[9] as string),
  }));
}

export function useIndicators(symbol: string | undefined, interval = "1m") {
  const [data, setData] = useState<Indicators | null>(null);
  const [klines, setKlines] = useState<Kline[]>([]);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    let timer: number | null = null;

    const tick = async () => {
      try {
        const k = await fetchKlines(symbol, interval, 100);
        if (cancelled) return;
        setKlines(k);
        setData(computeIndicators(k));
      } catch {
        /* ignore */
      }
    };
    tick();
    timer = window.setInterval(tick, 30_000); // refresh every 30s
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [symbol, interval]);

  return { indicators: data, klines };
}
