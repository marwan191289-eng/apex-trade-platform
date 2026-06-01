export function fmtPrice(n: number | null | undefined, opts: { digits?: number } = {}): string {
  if (n == null || isNaN(n)) return "—";
  const digits = opts.digits ?? (n >= 1000 ? 2 : n >= 1 ? 4 : 6);
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtUsd(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return "$" + fmtPrice(n);
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(2) + "K";
  return "$" + n.toFixed(2);
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return (n > 0 ? "+" : "") + n.toFixed(2) + "%";
}

export function fmtAmount(n: number | null | undefined, digits = 6): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}
