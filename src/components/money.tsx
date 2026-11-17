import { formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/finance/types";

export function Money({ cents, currency, className = "" }: { cents: number; currency: Currency; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{formatMoney(cents, currency)}</span>;
}
