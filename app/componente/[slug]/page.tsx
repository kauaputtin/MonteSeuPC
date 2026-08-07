import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { notFound } from "next/navigation";
import { SpecificationList } from "@/features/components/specification-list";
import { ComponentOffers } from "@/features/offers/component-offers";
import { PriceHistory } from "@/features/offers/price-history";
import { getCatalogData } from "@/lib/catalog";
import { availableOffersForComponent, getEffectiveOfferPrice } from "@/lib/offers";
import { getComponentPriceHistory } from "@/lib/price-history";
import { formatCurrency } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const component = (await getCatalogData()).components.find((item) => item.slug === slug);
  if (!component) return { title: "Componente não encontrado" };
  return { title: `${component.brand} ${component.name}`, description: component.description };
}

export default async function ComponentPage({ params }: Props) {
  const { slug } = await params;
  const catalog = await getCatalogData();
  const component = catalog.components.find((item) => item.slug === slug);
  if (!component) notFound();
  const category = catalog.categories.find((item) => item.slug === component.categorySlug);
  const productOffers = availableOffersForComponent(catalog.offers, component.id);
  const cheapest = productOffers[0];
  const priceHistory = catalog.source === "supabase" ? await getComponentPriceHistory(productOffers.map((offer) => offer.id)) : [];

  return (
    <div className="container-shell py-8 sm:py-12">
      <Link href="/montar" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-cyan-300"><ArrowLeft size={17} /> Voltar ao montador</Link>
      {catalog.source === "demo" && <p className="mb-6 rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-100">Produto, imagem e ofertas fictícios para demonstração. Configure uma fonte autorizada para consultar dados reais.</p>}
      <section className="grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
        <div className="surface relative aspect-[4/3] overflow-hidden rounded-lg"><Image src={component.imageUrl} fill priority alt={`${component.brand} ${component.name}`} className="object-cover" sizes="(max-width: 1024px) 100vw, 42vw" /></div>
        <div><p className="heading-label">{category?.name}</p><p className="mt-4 text-sm font-bold text-slate-500">{component.brand}</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">{component.name}</h1><p className="mt-5 max-w-2xl leading-7 text-slate-300">{component.description}</p>{component.specificationStatus === "verified" && catalog.source === "supabase" && <p className="mt-4 inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">Especificações verificadas</p>}{component.specificationStatus && component.specificationStatus !== "verified" && <p className="mt-4 rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-100">Compatibilidade não verificada: algumas especificações críticas ainda precisam de confirmação.</p>}<div className="mt-6 flex items-end gap-6 border-y border-slate-800 py-5"><div><p className="text-xs text-slate-500">{catalog.source === "demo" ? "Menor valor demonstrativo" : "Menor valor atual"}</p><p className="mt-1 text-3xl font-black text-white">{cheapest ? formatCurrency(getEffectiveOfferPrice(cheapest)) : "Sem oferta"}</p></div><div><p className="text-xs text-slate-500">Ofertas disponíveis</p><p className="mt-1 text-xl font-black">{productOffers.length}</p></div></div><h2 className="mb-3 mt-7 font-extrabold">Especificações</h2><SpecificationList component={component} /></div>
      </section>
      <section className="mt-12" aria-labelledby="offers-heading"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="heading-label">Comparação</p><h2 id="offers-heading" className="mt-2 text-2xl font-black">Ofertas disponíveis</h2></div><p className="flex items-center gap-2 text-xs text-slate-500"><Info size={15} /> {catalog.source === "demo" ? "Valores fictícios, não atuais." : "Preços e disponibilidade podem mudar no site da loja."}</p></div><ComponentOffers component={component} catalog={catalog} /></section>
      <PriceHistory points={priceHistory} />
    </div>
  );
}
