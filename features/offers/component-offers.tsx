"use client";

import { Check, ExternalLink, Plus, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OutboundLink } from "@/components/outbound-link";
import { CatalogProvider, useCatalog } from "@/features/catalog/catalog-context";
import { availableOffersForComponent, getEffectiveOfferPrice, preferredPurchaseUrl } from "@/lib/offers";
import { BuildProvider, useBuild } from "@/features/builder/build-context";
import { formatCurrency, formatDateTime, safeExternalUrl } from "@/lib/utils";
import type { CatalogData, Component } from "@/types/domain";

function Offers({ component }: { component: Component }) {
  const build = useBuild();
  const [includeNonNew, setIncludeNonNew] = useState(false);
  const { offers, stores } = useCatalog();
  const productOffers = availableOffersForComponent(offers, component.id, includeNonNew, build.paymentPreference);
  const hasNonNew = offers.some((offer) => offer.componentId === component.id && offer.available && !offer.staleAt && offer.condition && offer.condition !== "new");
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
      {hasNonNew && <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={includeNonNew} onChange={(event) => setIncludeNonNew(event.target.checked)} /> Mostrar também usadas, recondicionadas e caixa aberta</label>}
      {productOffers.map((offer, index) => {
        const store = stores.find((item) => item.id === offer.storeId);
        const selected = componentSelected && build.offers[component.categorySlug]?.id === offer.id;
        return <article key={offer.id} className={`surface grid gap-5 rounded-lg p-5 sm:grid-cols-[1fr_auto] sm:items-center ${selected ? "border-cyan-300/70" : ""}`}><div><div className="flex flex-wrap items-center gap-2"><StoreIcon size={17} className="text-slate-500" /><h3 className="font-bold">{store?.name}</h3>{offer.sellerName && <span className="text-xs text-slate-400">Vendedor: {offer.sellerName}</span>}<span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{offer.condition === "new" || !offer.condition ? "Novo" : offer.condition}</span>{index === 0 && <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-xs font-bold text-emerald-300">Menor valor</span>}{offer.affiliate && <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">Link afiliado</span>}</div><p className="mt-3 text-2xl font-black">{formatCurrency(getEffectiveOfferPrice(offer, build.paymentPreference))} <span className="text-xs font-normal text-slate-500">{build.paymentPreference === "pix" && offer.pixPrice ? "no Pix" : "preço normal"}</span></p>{offer.installmentPrice && offer.installments && <p className="mt-1 text-sm text-slate-400">{formatCurrency(offer.installmentPrice)} em até {offer.installments}x</p>}<p className="mt-2 text-xs text-slate-500">{offer.shippingPrice !== undefined ? `Frete informado: ${formatCurrency(offer.shippingPrice)}` : "Frete calculado no site da loja."} · Atualizado em {formatDateTime(offer.lastCheckedAt)}</p></div><div className="flex gap-2 sm:flex-col"><Button size="sm" variant={selected ? "secondary" : "primary"} onClick={() => choose(offer.id)}>{selected ? <><Check size={16} /> Selecionada</> : <><Plus size={16} /> Usar esta oferta</>}</Button><OutboundLink offerId={offer.id} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-bold hover:bg-slate-800" href={safeExternalUrl(preferredPurchaseUrl(offer))}>Abrir loja <ExternalLink size={15} /></OutboundLink></div></article>;
      })}
      {productOffers.length === 0 && <p className="surface rounded-lg p-6 text-center text-sm text-slate-500">Nenhuma oferta atualizada disponível.</p>}
      {productOffers.some((offer) => offer.affiliate) && <p className="rounded-md border border-cyan-300/20 bg-cyan-300/5 p-3 text-xs text-cyan-100">Podemos receber uma comissão pela compra, sem custo adicional para você.</p>}
      <p className="text-xs text-slate-500">Preços e disponibilidade podem mudar no site da loja. Confirme as informações antes da compra.</p>
    </div>
  );
}

export function ComponentOffers({ component, catalog }: { component: Component; catalog: CatalogData }) {
  return <CatalogProvider catalog={catalog}><BuildProvider><Offers component={component} /></BuildProvider></CatalogProvider>;
}
