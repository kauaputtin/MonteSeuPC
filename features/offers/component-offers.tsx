"use client";

import { Check, ExternalLink, Plus, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getEffectivePrice, getOffersForComponent, stores } from "@/data/mock-data";
import { BuildProvider, useBuild } from "@/features/builder/build-context";
import { formatCurrency, formatDateTime, safeExternalUrl } from "@/lib/utils";
import type { Component } from "@/types/domain";

function Offers({ component }: { component: Component }) {
  const build = useBuild();
  const productOffers = getOffersForComponent(component.id);
  const componentSelected = build.components[component.categorySlug]?.id === component.id;

  function choose(offerId: string) {
    const offer = productOffers.find((item) => item.id === offerId);
    if (!offer) return;
    build.selectComponent(component);
    build.selectOffer(component.categorySlug, offer);
    toast.success("Peça e oferta adicionadas à montagem.");
  }

  return (
    <div className="space-y-3">
      {productOffers.map((offer, index) => {
        const store = stores.find((item) => item.id === offer.storeId);
        const selected = componentSelected && build.offers[component.categorySlug]?.id === offer.id;
        return <article key={offer.id} className={`surface grid gap-5 rounded-lg p-5 sm:grid-cols-[1fr_auto] sm:items-center ${selected ? "border-cyan-300/70" : ""}`}><div><div className="flex flex-wrap items-center gap-2"><StoreIcon size={17} className="text-slate-500" /><h3 className="font-bold">{store?.name}</h3>{index === 0 && <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-xs font-bold text-emerald-300">Menor valor</span>}{offer.affiliate && <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">Link afiliado</span>}</div><p className="mt-3 text-2xl font-black">{formatCurrency(getEffectivePrice(offer))} <span className="text-xs font-normal text-slate-500">no Pix</span></p>{offer.installmentPrice && offer.installments && <p className="mt-1 text-sm text-slate-400">{formatCurrency(offer.installmentPrice)} em até {offer.installments}x</p>}<p className="mt-2 text-xs text-slate-500">{offer.shippingPrice !== undefined ? `Frete informado: ${formatCurrency(offer.shippingPrice)}` : "Frete calculado pela loja"} · Atualizado em {formatDateTime(offer.lastCheckedAt)}</p></div><div className="flex gap-2 sm:flex-col"><Button size="sm" variant={selected ? "secondary" : "primary"} onClick={() => choose(offer.id)}>{selected ? <><Check size={16} /> Selecionada</> : <><Plus size={16} /> Usar esta oferta</>}</Button><a className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-bold hover:bg-slate-800" href={safeExternalUrl(offer.productUrl)} target="_blank" rel="noopener noreferrer sponsored">Abrir loja <ExternalLink size={15} /></a></div></article>;
      })}
    </div>
  );
}

export function ComponentOffers({ component }: { component: Component }) {
  return <BuildProvider><Offers component={component} /></BuildProvider>;
}
