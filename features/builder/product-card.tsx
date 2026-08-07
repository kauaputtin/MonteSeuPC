"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, GitCompareArrows, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCatalog } from "@/features/catalog/catalog-context";
import { availableOffersForComponent, getEffectiveOfferPrice } from "@/lib/offers";
import { getKeySpecifications } from "@/features/components/specification-list";
import { OffersDialog } from "@/features/offers/offers-dialog";
import { useBuild } from "@/features/builder/build-context";
import { formatCurrency } from "@/lib/utils";
import type { CompatibilityResult, Component } from "@/types/domain";

export function ProductCard({ component, checks }: { component: Component; checks: CompatibilityResult[] }) {
  const [offersOpen, setOffersOpen] = useState(false);
  const { offers, source } = useCatalog();
  const { components: selected, selectComponent, paymentPreference } = useBuild();
  const productOffers = availableOffersForComponent(offers, component.id, false, paymentPreference);
  const cheapest = productOffers[0];
  const status = checks.some((item) => item.status === "incompatible") ? "incompatible" : checks.some((item) => item.status === "warning") ? "warning" : "compatible";
  const selectedItem = selected[component.categorySlug]?.id === component.id;
  const issue = checks.find((item) => item.status !== "compatible");

  return (
    <article className={`surface animate-enter overflow-hidden rounded-lg transition-colors ${selectedItem ? "border-cyan-300/80 ring-1 ring-cyan-300/30" : "hover:border-slate-600"}`}>
      <div className="grid sm:grid-cols-[170px_1fr]">
        <Link href={`/componente/${component.slug}`} className="relative aspect-[16/10] bg-slate-950 sm:aspect-auto sm:min-h-56">
          <Image src={component.imageUrl} fill alt={`${component.brand} ${component.name}`} className="object-cover transition-transform duration-300 hover:scale-[1.03]" sizes="(max-width: 640px) 100vw, 170px" />
          {source === "demo" && <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">Imagem demo</span>}
        </Link>
        <div className="flex min-w-0 flex-col p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{component.brand}</p><Link href={`/componente/${component.slug}`} className="mt-1 block truncate text-lg font-black hover:text-cyan-300">{component.name}</Link></div><StatusBadge status={status} /></div>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            {getKeySpecifications(component).map(([label, value]) => <div key={label} className="min-w-0"><dt className="truncate text-[11px] text-slate-500">{label}</dt><dd className="mt-0.5 truncate text-xs font-bold text-slate-200">{value}</dd></div>)}
          </dl>
          {issue && <p className={`mt-3 text-xs leading-5 ${status === "incompatible" ? "text-rose-300" : "text-amber-300"}`}>{issue.message}</p>}
          <div className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[11px] text-slate-500">A partir de · {productOffers.length} {productOffers.length === 1 ? "oferta" : "ofertas"}</p><p className="mt-0.5 text-xl font-black">{cheapest ? formatCurrency(getEffectiveOfferPrice(cheapest, paymentPreference)) : "Sem oferta"}</p></div>
            <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setOffersOpen(true)}><GitCompareArrows size={16} /> Ver ofertas</Button><Button size="sm" disabled={status === "incompatible"} onClick={() => selectComponent(component)}>{selectedItem ? <><Check size={16} /> Adicionado</> : <><Plus size={16} /> Adicionar</>}</Button></div>
          </div>
        </div>
      </div>
      <OffersDialog component={component} open={offersOpen} onClose={() => setOffersOpen(false)} />
    </article>
  );
}
