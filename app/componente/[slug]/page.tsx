import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { notFound } from "next/navigation";
import { categories, components, getOffersForComponent } from "@/data/mock-data";
import { SpecificationList } from "@/features/components/specification-list";
import { ComponentOffers } from "@/features/offers/component-offers";
import { formatCurrency } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return components.map((component) => ({ slug: component.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const component = components.find((item) => item.slug === slug);
  if (!component) return { title: "Componente não encontrado" };
  return { title: `${component.brand} ${component.name}`, description: component.description };
}

export default async function ComponentPage({ params }: Props) {
  const { slug } = await params;
  const component = components.find((item) => item.slug === slug);
  if (!component) notFound();
  const category = categories.find((item) => item.slug === component.categorySlug);
  const cheapest = getOffersForComponent(component.id)[0];

  return (
    <div className="container-shell py-8 sm:py-12">
      <Link href="/montar" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-cyan-300"><ArrowLeft size={17} /> Voltar ao montador</Link>
      <section className="grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
        <div className="surface relative aspect-[4/3] overflow-hidden rounded-lg"><Image src={component.imageUrl} fill priority alt={`Ilustração demonstrativa de ${component.brand} ${component.name}`} className="object-cover" sizes="(max-width: 1024px) 100vw, 42vw" /><span className="absolute bottom-3 left-3 rounded bg-black/75 px-2 py-1 text-xs font-bold text-slate-300">Imagem demonstrativa</span></div>
        <div><p className="heading-label">{category?.name}</p><p className="mt-4 text-sm font-bold text-slate-500">{component.brand}</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">{component.name}</h1><p className="mt-5 max-w-2xl leading-7 text-slate-300">{component.description}</p><div className="mt-6 flex items-end gap-6 border-y border-slate-800 py-5"><div><p className="text-xs text-slate-500">Menor valor demonstrativo</p><p className="mt-1 text-3xl font-black text-white">{cheapest ? formatCurrency(cheapest.pixPrice ?? cheapest.price) : "Sem oferta"}</p></div><div><p className="text-xs text-slate-500">Ofertas disponíveis</p><p className="mt-1 text-xl font-black">{getOffersForComponent(component.id).length}</p></div></div><h2 className="mb-3 mt-7 font-extrabold">Especificações</h2><SpecificationList component={component} /></div>
      </section>
      <section className="mt-12" aria-labelledby="offers-heading"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="heading-label">Comparação</p><h2 id="offers-heading" className="mt-2 text-2xl font-black">Ofertas disponíveis</h2></div><p className="flex items-center gap-2 text-xs text-slate-500"><Info size={15} /> Preços de demonstração, não atuais.</p></div><ComponentOffers component={component} /></section>
    </div>
  );
}
