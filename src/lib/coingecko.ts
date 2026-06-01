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

export const TOP_COINS = [
  "bitcoin","ethereum","tether","binancecoin","solana","ripple","usd-coin",
  "cardano","dogecoin","tron","avalanche-2","chainlink","polkadot","matic-network",
  "shiba-inu","litecoin","uniswap","cosmos","stellar","monero",
];

export function symbolToId(symbol: string): string {
  const map: Record<string, string> = {
    btc: "bitcoin", eth: "ethereum", usdt: "tether", bnb: "binancecoin",
    sol: "solana", xrp: "ripple", usdc: "usd-coin", ada: "cardano",
    doge: "dogecoin", trx: "tron", avax: "avalanche-2", link: "chainlink",
    dot: "polkadot", matic: "matic-network", shib: "shiba-inu",
    ltc: "litecoin", uni: "uniswap", atom: "cosmos", xlm: "stellar", xmr: "monero",
  };
  return map[symbol.toLowerCase()] ?? symbol.toLowerCase();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json() as Promise<T>;
}

export const marketsQuery = queryOptions({
  queryKey: ["markets", "top"],
  queryFn: () => fetchJson<MarketCoin[]>(
    `${BASE}/coins/markets?vs_currency=usd&ids=${TOP_COINS.join(",")}&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h`
  ),
  staleTime: 60_000,
  refetchInterval: 60_000,
});

export const coinDetailQuery = (id: string) => queryOptions({
  queryKey: ["coin", id],
  queryFn: () => fetchJson<MarketCoin[]>(
    `${BASE}/coins/markets?vs_currency=usd&ids=${id}&sparkline=true&price_change_percentage=24h`
  ).then(arr => arr[0]),
  staleTime: 30_000,
  refetchInterval: 15_000,
  enabled: !!id,
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
