"use client";

import { useEffect, useRef } from "react";
import { Check, ExternalLink, Info, Store as StoreIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEffectivePrice, getOffersForComponent, stores } from "@/data/mock-data";
import { useBuild } from "@/features/builder/build-context";
import { formatCurrency, formatDateTime, safeExternalUrl } from "@/lib/utils";
import type { Component } from "@/types/domain";

export function OffersDialog({ component, open, onClose }: { component: Component; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { offers: selectedOffers, selectOffer } = useBuild();
  const productOffers = getOffersForComponent(component.id);

  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => { if (event.target === ref.current) onClose(); }}
      aria-labelledby="offers-title"
      className="m-auto max-h-[90vh] w-[min(720px,calc(100%-24px))] overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-0 text-slate-100 shadow-2xl backdrop:bg-black/75"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-950/95 p-5 backdrop-blur">
        <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Ofertas demonstrativas</p><h2 id="offers-title" className="mt-1 text-xl font-black">{component.name}</h2></div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar ofertas"><X size={20} /></Button>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        {productOffers.map((offer, index) => {
          const store = stores.find((item) => item.id === offer.storeId);
          const selected = selectedOffers[component.categorySlug]?.id === offer.id;
          return (
            <article key={offer.id} className={`rounded-md border p-4 ${selected ? "border-cyan-300 bg-cyan-300/5" : "border-slate-800 bg-slate-900/60"}`}>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><StoreIcon size={17} className="text-slate-400" /><h3 className="font-bold">{store?.name}</h3>{index === 0 && <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-xs font-bold text-emerald-300">Menor valor</span>}{offer.affiliate && <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">Link afiliado</span>}</div>
                  <p className="mt-2 text-2xl font-black text-white">{formatCurrency(getEffectivePrice(offer))} <span className="text-xs font-normal text-slate-400">no Pix</span></p>
                  {offer.installmentPrice && offer.installments && <p className="mt-1 text-sm text-slate-400">ou {formatCurrency(offer.installmentPrice)} em até {offer.installments}x</p>}
                  <p className="mt-2 text-xs text-slate-500">{offer.shippingPrice !== undefined ? `Frete informado: ${formatCurrency(offer.shippingPrice)}` : "Frete calculado pela loja"} · Atualizado em {formatDateTime(offer.lastCheckedAt)}</p>
                </div>
                <div className="flex gap-2 sm:flex-col">
                  <Button size="sm" variant={selected ? "secondary" : "primary"} onClick={() => selectOffer(component.categorySlug, offer)}>{selected ? <><Check size={16} /> Selecionada</> : "Escolher oferta"}</Button>
                  <a className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-bold text-slate-200 hover:bg-slate-800" href={safeExternalUrl(offer.productUrl)} target="_blank" rel="noopener noreferrer sponsored">Ir para a loja <ExternalLink size={15} /></a>
                </div>
              </div>
            </article>
          );
        })}
        <div className="flex gap-2 rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100/80"><Info size={16} className="mt-0.5 shrink-0 text-amber-300" /> Preços e disponibilidade podem mudar no site da loja. Estes dados são fictícios e existem apenas para demonstração.</div>
      </div>
    </dialog>
  );
}
