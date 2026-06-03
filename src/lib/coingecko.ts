import { queryOptions } from "@tanstack/react-query";

const BASE = "https://api.coingecko.com/api/v3";

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price: number[] };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json() as Promise<T>;
}

// In-memory fallback so a transient 429/network error doesn't blank the SSR.
let lastMarkets: MarketCoin[] = [];

async function fetchAllMarkets(): Promise<MarketCoin[]> {
  try {
    const [p1, p2] = await Promise.all([
      fetchJson<MarketCoin[]>(
        `${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h`
      ),
      fetchJson<MarketCoin[]>(
        `${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=2&sparkline=true&price_change_percentage=24h`
      ).catch(() => [] as MarketCoin[]),
    ]);
    lastMarkets = [...p1, ...p2];
    return lastMarkets;
  } catch (err) {
    console.error("[coingecko] markets fetch failed, using cached fallback", err);
    return lastMarkets;
  }
}

export const marketsQuery = queryOptions({
  queryKey: ["markets", "all"],
  queryFn: fetchAllMarkets,
  staleTime: 60_000,
  refetchInterval: 60_000,
  retry: 1,
});

// Resolve a ticker symbol (e.g. "BTC") to a CoinGecko id by looking it up in
// the cached markets list. Falls back to a small static map, then lowercased symbol.
const FALLBACK_MAP: Record<string, string> = {
  btc: "bitcoin", eth: "ethereum", usdt: "tether", bnb: "binancecoin",
  sol: "solana", xrp: "ripple", usdc: "usd-coin", ada: "cardano",
  doge: "dogecoin", trx: "tron", avax: "avalanche-2", link: "chainlink",
  dot: "polkadot", matic: "matic-network", shib: "shiba-inu",
  ltc: "litecoin", uni: "uniswap", atom: "cosmos", xlm: "stellar", xmr: "monero",
};

export function symbolToId(symbol: string, coins?: MarketCoin[]): string {
  const s = symbol.toLowerCase();
  if (coins) {
    const found = coins.find((c) => c.symbol.toLowerCase() === s);
    if (found) return found.id;
  }
  return FALLBACK_MAP[s] ?? s;
}

export const coinDetailQuery = (id: string) => queryOptions({
  queryKey: ["coin", id],
  queryFn: () => fetchJson<MarketCoin[]>(
    `${BASE}/coins/markets?vs_currency=usd&ids=${id}&sparkline=true&price_change_percentage=24h`
  ).then(arr => arr[0] ?? lastMarkets.find(c => c.id === id) ?? null)
   .catch(() => lastMarkets.find(c => c.id === id) ?? null),
  staleTime: 30_000,
  refetchInterval: 15_000,
  enabled: !!id,
  retry: 1,
});

export interface OHLC { time: number; open: number; high: number; low: number; close: number; }

export const ohlcQuery = (id: string, days = 1) => queryOptions({
  queryKey: ["ohlc", id, days],
  queryFn: async (): Promise<OHLC[]> => {
    const raw = await fetchJson<number[][]>(`${BASE}/coins/${id}/ohlc?vs_currency=usd&days=${days}`);
    return raw.map(([t, o, h, l, c]) => ({ time: t, open: o, high: h, low: l, close: c }));
  },
  staleTime: 60_000,
  refetchInterval: 60_000,
  enabled: !!id,
});
