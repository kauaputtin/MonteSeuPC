"use client";

import { ArrowLeft, ArrowRight, Check, ChevronRight, Search, SlidersHorizontal, Wrench, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { categories, components } from "@/data/mock-data";
import { BuildProvider, useBuild, useDebouncedValue } from "@/features/builder/build-context";
import { BuildSummary } from "@/features/builder/build-summary";
import { ProductCard } from "@/features/builder/product-card";
import { evaluateCandidate } from "@/lib/compatibility/compatibility-engine";
import { formatCurrency } from "@/lib/utils";
import type { Component } from "@/types/domain";

function getFilterValue(item: Component) {
  const specs = item.specifications;
  switch (specs.kind) {
    case "processor": return specs.socket;
    case "motherboard": return specs.socket;
    case "memory": return specs.memoryType;
    case "gpu": return `${specs.vramGb} GB VRAM`;
    case "storage": return specs.storageType;
    case "psu": return `${specs.wattage} W`;
    case "case": return specs.motherboardFormFactors[0];
    case "cooler": return specs.coolerType;
  }
}

function WizardContent() {
  const build = useBuild();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [specFilter, setSpecFilter] = useState("all");
  const [showIncompatible, setShowIncompatible] = useState(false);
  const debouncedQuery = useDebouncedValue(query);
  const category = categories[build.currentStep];
  const isSummary = build.currentStep === categories.length;
  const categoryProducts = useMemo(() => category ? components.filter((item) => item.categorySlug === category.slug && item.active) : [], [category]);
  const brands = [...new Set(categoryProducts.map((item) => item.brand))];
  const filters = [...new Set(categoryProducts.map(getFilterValue))];

  const candidates = useMemo(() => categoryProducts.map((item) => ({ item, checks: evaluateCandidate(item, build.components) })), [categoryProducts, build.components]);
  const filtered = candidates.filter(({ item, checks }) => {
    const normalized = debouncedQuery.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch = !normalized || `${item.brand} ${item.name} ${item.description}`.toLocaleLowerCase("pt-BR").includes(normalized);
    const matchesBrand = brand === "all" || item.brand === brand;
    const matchesSpec = specFilter === "all" || getFilterValue(item) === specFilter;
    const incompatible = checks.some((check) => check.status === "incompatible");
    const currentlySelected = build.components[item.categorySlug]?.id === item.id;
    return matchesSearch && matchesBrand && matchesSpec && (showIncompatible || !incompatible || currentlySelected);
  });

  if (!build.hydrated) return <div className="container-shell py-10"><Skeleton className="h-16" /><div className="mt-8 grid gap-5 lg:grid-cols-[230px_1fr]"><Skeleton className="h-[540px]" /><div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-60" /><Skeleton className="h-60" /></div></div></div>;

  return (
    <div className="container-shell py-8 sm:py-10">
      <div className="mb-7">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400"><span>Progresso da montagem</span><span>{Math.round(((build.currentStep + 1) / 9) * 100)}%</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label="Progresso da montagem" aria-valuemin={1} aria-valuemax={9} aria-valuenow={build.currentStep + 1}><div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${((build.currentStep + 1) / 9) * 100}%` }} /></div>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[225px_minmax(0,1fr)] xl:grid-cols-[225px_minmax(0,1fr)_230px]">
        <aside className="scrollbar-thin -mx-3 overflow-x-auto px-3 lg:sticky lg:top-24 lg:mx-0 lg:overflow-visible lg:px-0" aria-label="Etapas da montagem">
          <ol className="flex min-w-max gap-2 lg:grid lg:min-w-0 lg:gap-1">
            {categories.map((item, index) => {
              const selected = build.components[item.slug];
              const current = build.currentStep === index;
              return <li key={item.id}><button onClick={() => build.setStep(index)} aria-current={current ? "step" : undefined} className={`group flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors ${current ? "border-cyan-300/30 bg-cyan-300/10 text-white" : "border-transparent text-slate-400 hover:bg-slate-900 hover:text-white"}`}><span className={`grid size-7 shrink-0 place-items-center rounded text-xs font-black ${selected ? "bg-emerald-400/15 text-emerald-300" : current ? "bg-cyan-300 text-slate-950" : "bg-slate-800"}`}>{selected ? <Check size={15} /> : index + 1}</span><span className="text-sm font-bold">{item.name}</span>{current && <ChevronRight size={15} className="ml-auto hidden text-cyan-300 lg:block" />}</button></li>;
            })}
            <li><button onClick={() => build.setStep(8)} aria-current={isSummary ? "step" : undefined} className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors ${isSummary ? "border-cyan-300/30 bg-cyan-300/10 text-white" : "border-transparent text-slate-400 hover:bg-slate-900 hover:text-white"}`}><span className={`grid size-7 place-items-center rounded text-xs font-black ${isSummary ? "bg-cyan-300 text-slate-950" : "bg-slate-800"}`}>9</span><span className="text-sm font-bold">Resumo</span></button></li>
          </ol>
        </aside>

        <main className="min-w-0">
          {isSummary ? <BuildSummary /> : category && (
            <section aria-labelledby="category-title">
              <div><p className="heading-label">Etapa {build.currentStep + 1} de 9</p><h1 id="category-title" className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Escolha: {category.name}</h1><p className="mt-2 max-w-2xl leading-7 text-slate-400">{category.description}</p></div>

              <div className="surface mt-6 grid gap-3 rounded-lg p-3 md:grid-cols-[minmax(180px,1fr)_180px_180px]">
                <label className="relative"><span className="sr-only">Buscar {category.name}</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-md border border-slate-700 bg-slate-950 pl-10 pr-3 text-sm text-white placeholder:text-slate-600" placeholder={`Buscar ${category.name.toLowerCase()}...`} /></label>
                <label><span className="sr-only">Filtrar fabricante</span><select value={brand} onChange={(event) => setBrand(event.target.value)} className="h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200"><option value="all">Todos os fabricantes</option>{brands.map((value) => <option key={value}>{value}</option>)}</select></label>
                <label><span className="sr-only">Filtrar especificação</span><select value={specFilter} onChange={(event) => setSpecFilter(event.target.value)} className="h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200"><option value="all">Todas as especificações</option>{filters.map((value) => <option key={value}>{value}</option>)}</select></label>
              </div>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={showIncompatible} onChange={(event) => setShowIncompatible(event.target.checked)} className="size-4 accent-cyan-300" /><span>Mostrar também incompatíveis</span><SlidersHorizontal size={15} className="text-slate-500" /></label>

              <div className="mt-5 space-y-4">
                {filtered.map(({ item, checks }) => <ProductCard key={item.id} component={item} checks={checks} />)}
                {filtered.length === 0 && <div className="surface grid min-h-56 place-items-center rounded-lg p-8 text-center"><div><Wrench className="mx-auto text-slate-600" /><h2 className="mt-3 font-bold">Nenhuma peça encontrada</h2><p className="mt-1 text-sm text-slate-500">Ajuste os filtros ou habilite a exibição de incompatíveis.</p></div></div>}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-5"><Button variant="ghost" disabled={build.currentStep === 0} onClick={() => build.setStep(build.currentStep - 1)}><ArrowLeft size={17} /> Voltar</Button><Button disabled={!build.components[category.slug]} onClick={() => build.setStep(build.currentStep + 1)}>Continuar <ArrowRight size={17} /></Button></div>
            </section>
          )}
        </main>

        <aside className="surface sticky top-24 hidden rounded-lg p-4 xl:block">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sua montagem</p><p className="mt-2 text-2xl font-black">{formatCurrency(build.total)}</p><p className="mt-1 text-xs text-slate-500">Menores ofertas ou lojas escolhidas</p>
          <div className="my-4 border-t border-slate-800" />
          <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-400"><Zap size={16} className="text-cyan-300" /> Consumo</span><strong>{build.estimatedWatts} W</strong></div><div className="mt-3 flex items-center justify-between text-sm"><span className="text-slate-400">Fonte indicada</span><strong>{build.recommendedPsuWatts} W</strong></div>
          <Button className="mt-5 w-full" size="sm" variant="secondary" onClick={() => build.setStep(8)}>Ver resumo</Button>
        </aside>
      </div>
    </div>
  );
}

export function BuilderWizard() {
  return <BuildProvider><WizardContent /></BuildProvider>;
}
