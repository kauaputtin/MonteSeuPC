"use client";

import Image from "next/image";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Save, Share2, ShoppingCart, Trash2, Wrench, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OutboundLink } from "@/components/outbound-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCatalog } from "@/features/catalog/catalog-context";
import { useBuild } from "@/features/builder/build-context";
import { availableOffersForComponent, getEffectiveOfferPrice, preferredPurchaseUrl } from "@/lib/offers";
import { formatCurrency, safeExternalUrl } from "@/lib/utils";

export function BuildSummary() {
  const build = useBuild();
  const { categories, offers, stores } = useCatalog();
  const [sharing, setSharing] = useState(false);

  async function createShareUrl() {
    setSharing(true);
    try {
      const response = await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Minha montagem",
          components: Object.fromEntries(Object.entries(build.components).map(([key, item]) => [key, item?.id])),
          offers: Object.fromEntries(Object.entries(build.offers).map(([key, item]) => [key, item?.id]))
        })
      });
      const data = await response.json() as { path?: string; error?: string };
      if (!response.ok || !data.path) throw new Error(data.error || "Não foi possível compartilhar.");
      return `${window.location.origin}${data.path}`;
    } finally {
      setSharing(false);
    }
  }

  async function copyLink() {
    try {
      const url = await createShareUrl();
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao copiar o link.");
    }
  }

  async function share() {
    try {
      const url = await createShareUrl();
      if (navigator.share) await navigator.share({ title: "Minha montagem de PC", url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Compartilhamento não disponível; link copiado.");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") toast.error(error.message);
    }
  }

  const selectedCount = Object.values(build.components).filter(Boolean).length;

  return (
    <section className="animate-enter" aria-labelledby="summary-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><p className="heading-label">Etapa 9 de 9</p><h1 id="summary-title" className="mt-2 text-3xl font-black tracking-tight">Resumo da montagem</h1><p className="mt-2 text-slate-400">Revise peças, lojas e alertas antes de seguir para a compra.</p></div>
        <StatusBadge status={build.overallStatus} className="self-start" />
      </div>
      <fieldset className="surface mt-5 flex flex-wrap items-center gap-4 rounded-lg p-4"><legend className="sr-only">Preferência de pagamento</legend><span className="text-sm font-bold">Calcular total por:</span><label className="flex items-center gap-2 text-sm"><input type="radio" name="payment" checked={build.paymentPreference === "pix"} onChange={() => build.setPaymentPreference("pix")} /> Menor preço no Pix</label><label className="flex items-center gap-2 text-sm"><input type="radio" name="payment" checked={build.paymentPreference === "normal"} onChange={() => build.setPaymentPreference("normal")} /> Menor preço normal</label></fieldset>

      {build.alerts.some((alert) => alert.status !== "compatible") && (
        <div className="mt-6 space-y-2" aria-live="polite">
          {build.alerts.filter((alert) => alert.status !== "compatible").map((alert) => (
            <div key={alert.code} className={`flex gap-3 rounded-md border p-3 text-sm ${alert.status === "incompatible" ? "border-rose-400/25 bg-rose-400/5 text-rose-200" : "border-amber-400/25 bg-amber-400/5 text-amber-100"}`}>
              <AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>{alert.message}{alert.status === "incompatible" && " Troque uma das peças envolvidas para continuar com segurança."}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {categories.map((category, index) => {
          const component = build.components[category.slug];
          const selectedOffer = build.offers[category.slug];
          const offer = selectedOffer?.available && !selectedOffer.staleAt ? selectedOffer : (component ? availableOffersForComponent(offers, component.id, false, build.paymentPreference)[0] : undefined);
          const store = offer ? stores.find((item) => item.id === offer.storeId) : undefined;
          return (
            <article key={category.id} className="surface grid gap-4 rounded-lg p-4 sm:grid-cols-[64px_1fr_auto] sm:items-center">
              {component ? <div className="relative size-16 overflow-hidden rounded-md bg-slate-900"><Image src={component.imageUrl} fill alt={`Ilustração de ${component.name}`} className="object-cover" sizes="64px" /></div> : <div className="grid size-16 place-items-center rounded-md border border-dashed border-slate-700 bg-slate-900 text-slate-600"><Wrench size={22} /></div>}
              <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{category.name}</p>{component ? <><h2 className="mt-1 truncate font-extrabold">{component.brand} {component.name}</h2><p className="mt-1 text-xs text-slate-400">{store?.name ?? "Oferta de referência"}{offer?.condition && offer.condition !== "new" ? ` · ${offer.condition}` : ""}{!selectedOffer && offer ? " · menor oferta usada como referência" : ""}</p></> : <p className="mt-1 text-sm text-slate-400">Nenhum componente selecionado</p>}</div>
              <div className="flex items-center justify-between gap-3 sm:justify-end"><div className="text-right"><p className="font-black">{offer ? formatCurrency(getEffectiveOfferPrice(offer, build.paymentPreference)) : "—"}</p></div><Button size="sm" variant="secondary" onClick={() => build.setStep(index)}>{component ? "Trocar" : "Escolher"}</Button>{offer && <OutboundLink offerId={offer.id} href={safeExternalUrl(preferredPurchaseUrl(offer))} className="grid size-9 place-items-center rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800" aria-label={`Comprar ${component?.name}`}><ShoppingCart size={17} /></OutboundLink>}</div>
            </article>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="surface rounded-lg p-5">
          <h2 className="font-extrabold">Estimativa de energia</h2>
          <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-md bg-slate-950 p-4"><Zap className="mb-3 text-cyan-300" size={20} /><p className="text-xs text-slate-500">Consumo estimado</p><p className="mt-1 text-2xl font-black">{build.estimatedWatts} W</p></div><div className="rounded-md bg-slate-950 p-4"><CheckCircle2 className="mb-3 text-emerald-400" size={20} /><p className="text-xs text-slate-500">Fonte recomendada</p><p className="mt-1 text-2xl font-black">{build.recommendedPsuWatts} W</p></div></div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Estimativa baseada no consumo informado das peças, com margem de segurança. Picos, overclock e periféricos podem alterar o resultado.</p>
        </div>
        <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/5 p-5">
          <p className="text-sm text-slate-400">Total da configuração</p><p className="mt-1 text-4xl font-black tracking-tight text-white">{formatCurrency(build.total)}</p><p className="mt-2 text-xs text-slate-500">{selectedCount} de {categories.length} peças · frete não incluído quando não informado</p>
          <div className="mt-5 grid grid-cols-2 gap-2"><Button onClick={copyLink} disabled={sharing || selectedCount === 0} variant="secondary"><Copy size={17} /> Copiar link</Button><Button onClick={share} disabled={sharing || selectedCount === 0}><Share2 size={17} /> Compartilhar</Button></div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-800 pt-5">
        <Button variant="secondary" onClick={() => toast.success("Montagem salva neste navegador.")}><Save size={17} /> Salvar montagem</Button>
        <Button variant="danger" onClick={() => { if (window.confirm("Limpar todas as peças e ofertas desta montagem?")) { build.clear(); toast.success("Montagem limpa."); } }}><Trash2 size={17} /> Limpar montagem</Button>
        <p className="flex items-center gap-2 text-xs text-slate-500 sm:ml-auto"><ExternalLink size={14} /> Compras abrem em uma nova aba.</p>
      </div>
    </section>
  );
}
