import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { PricePoint } from "@/lib/price-history";

export function PriceHistory({ points }: { points: PricePoint[] }) {
  const available = points.filter((point) => point.available).slice(-30);
  if (available.length < 2) return null;
  const values = available.map((point) => point.pixPrice ?? point.price); const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(1, max - min);
  const line = values.map((value, index) => `${index ? "L" : "M"} ${(index / (values.length - 1)) * 100} ${92 - ((value - min) / range) * 80}`).join(" ");
  const latest = available.at(-1)!;
  return <section className="surface mt-10 rounded-lg p-5" aria-labelledby="price-history-title"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="heading-label">Evolução</p><h2 id="price-history-title" className="mt-2 text-2xl font-black">Histórico de preço</h2></div><p className="text-sm text-slate-400">Último valor: <strong className="text-white">{formatCurrency(latest.pixPrice ?? latest.price)}</strong></p></div><svg className="mt-5 h-40 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Preço variou entre ${formatCurrency(min)} e ${formatCurrency(max)}`}><path d={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" className="text-cyan-300" /></svg><div className="mt-2 flex justify-between text-xs text-slate-500"><span>{formatDateTime(available[0].capturedAt)}</span><span>Mín. {formatCurrency(min)} · Máx. {formatCurrency(max)}</span><span>{formatDateTime(latest.capturedAt)}</span></div></section>;
}
