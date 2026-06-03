import { useEffect, useRef, useState } from "react";
import { fmtPrice, fmtPct } from "@/lib/format";
import { useLivePrice } from "@/lib/live-prices";

type Flash = "up" | "down" | null;

export function LivePriceCell({
  symbol,
  fallbackPrice,
  fallbackChangePct,
  className = "",
  showChange = false,
}: {
  symbol: string;
  fallbackPrice: number;
  fallbackChangePct?: number;
  className?: string;
  showChange?: boolean;
}) {
  const live = useLivePrice(symbol);
  const price = live?.price ?? fallbackPrice;
  const changePct = live?.changePct ?? fallbackChangePct ?? 0;

  const prevRef = useRef<number>(price);
  const [flash, setFlash] = useState<Flash>(null);

  useEffect(() => {
    if (price === prevRef.current) return;
    setFlash(price > prevRef.current ? "up" : "down");
    prevRef.current = price;
    const id = window.setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(id);
  }, [price]);

  const flashCls = flash === "up" ? "text-success" : flash === "down" ? "text-danger" : "";
  const up = changePct >= 0;

  return (
    <span className={`inline-flex flex-col items-end font-mono transition-colors ${flashCls} ${className}`}>
      <span>${fmtPrice(price)}</span>
      {showChange && (
        <span className={`text-[10px] ${up ? "text-success" : "text-danger"}`}>{fmtPct(changePct)}</span>
      )}
    </span>
  );
}
