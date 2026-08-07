import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearch, ShieldCheck } from "lucide-react";
import { MarketplaceProductCard } from "@/features/marketplace/marketplace-product-card";
import { getMarketplaceProducts, marketplaceCategoryFilters } from "@/lib/marketplace";
import { categorySlugs, type CategorySlug } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Produtos reais do Mercado Livre",
  description: "Produtos e ofertas reais coletados da API oficial do Mercado Livre para montar seu PC."
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const requestedCategory = (await searchParams).categoria;
  const category = categorySlugs.includes(requestedCategory as CategorySlug) ? requestedCategory as CategorySlug : null;
  const products = await getMarketplaceProducts();
  const visibleProducts = category ? products.filter((product) => product.categorySlug === category) : products;
  const offersCount = products.reduce((total, product) => total + product.offers.length, 0);
  return (
    <main className="container-shell py-12 sm:py-16">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div><p className="heading-label">Catálogo conectado</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Produtos reais do Mercado Livre</h1><p className="mt-4 max-w-3xl leading-7 text-slate-400">Aqui aparecem somente produtos que possuem ofertas ativas retornadas pela integração oficial. Os dados demonstrativos continuam separados no montador.</p></div>
        <div className="surface flex shrink-0 gap-6 rounded-lg p-4 text-center"><div><p className="text-2xl font-black text-cyan-300">{products.length}</p><p className="text-xs text-slate-500">produtos</p></div><div className="border-l border-slate-700 pl-6"><p className="text-2xl font-black text-cyan-300">{offersCount}</p><p className="text-xs text-slate-500">ofertas</p></div></div>
      </div>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filtrar produtos por categoria">
        <Link href="/produtos" className={`rounded-full border px-3 py-2 text-xs font-bold ${!category ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>Todos</Link>
        {marketplaceCategoryFilters.map((filter) => <Link key={filter.slug} href={`/produtos?categoria=${filter.slug}`} className={`rounded-full border px-3 py-2 text-xs font-bold ${category === filter.slug ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>{filter.name}</Link>)}
      </nav>

      {visibleProducts.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{visibleProducts.map((product) => <MarketplaceProductCard key={product.id} product={product} />)}</div> : <div className="surface mt-8 grid min-h-64 place-items-center rounded-lg p-8 text-center"><div><PackageSearch className="mx-auto text-slate-600" size={42} /><h2 className="mt-4 text-xl font-black">Nenhum produto com oferta nesta categoria</h2><p className="mt-2 text-sm text-slate-500">Execute uma nova sincronização ou escolha outra categoria.</p></div></div>}

      <div className="mt-10 flex gap-3 rounded-md border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100/80"><ShieldCheck className="mt-0.5 shrink-0 text-amber-300" size={18} /><p>Estes produtos são reais, mas ainda não recebem validação automática de compatibilidade enquanto os dados técnicos não estiverem completos. Confirme modelo, especificações, preço e disponibilidade no Mercado Livre antes da compra.</p></div>
    </main>
  );
}
