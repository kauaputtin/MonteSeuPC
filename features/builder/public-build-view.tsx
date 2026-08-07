import Image from "next/image";
import Link from "next/link";
import { Calendar, ExternalLink, LockKeyhole, Zap } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { categories, getEffectivePrice, getOffersForComponent, stores } from "@/data/mock-data";
import { calculateBuildTotal } from "@/lib/calculations";
import { calculateEstimatedWatts, calculateRecommendedPsuWatts, evaluateBuild, getOverallStatus } from "@/lib/compatibility/compatibility-engine";
import { formatCurrency, formatDateTime, safeExternalUrl } from "@/lib/utils";
import type { PublicBuild } from "@/types/domain";

export function PublicBuildView({ build, demo }: { build: PublicBuild; demo?: boolean }) {
  const alerts = evaluateBuild(build.components);
  const total = calculateBuildTotal(build.components, build.offers);
  return (
    <div className="container-shell py-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500"><LockKeyhole size={14} /> Visualização somente leitura</div><h1 className="text-3xl font-black tracking-tight sm:text-5xl">{build.name}</h1><p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Calendar size={15} /> Criada em {formatDateTime(build.createdAt)}</p></div><StatusBadge status={getOverallStatus(alerts)} className="self-start" /></div>
      {demo && <p className="mt-6 rounded-md border border-cyan-300/20 bg-cyan-300/5 p-3 text-sm text-cyan-100">Link portátil em modo demonstração. Configure o Supabase para armazenar montagens permanentemente.</p>}
      <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">{categories.map((category) => {
          const component = build.components[category.slug];
          if (!component) return null;
          const offer = build.offers[category.slug] ?? getOffersForComponent(component.id)[0];
          const store = offer ? stores.find((item) => item.id === offer.storeId) : undefined;
          return <article key={category.id} className="surface grid grid-cols-[64px_1fr] gap-4 rounded-lg p-4 sm:grid-cols-[64px_1fr_auto] sm:items-center"><div className="relative size-16 overflow-hidden rounded-md bg-slate-900"><Image src={component.imageUrl} fill alt={`Ilustração de ${component.name}`} className="object-cover" sizes="64px" /></div><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{category.name}</p><h2 className="mt-1 truncate font-extrabold">{component.brand} {component.name}</h2><p className="mt-1 text-xs text-slate-500">{store?.name ?? "Oferta de referência"}</p></div><div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1"><strong>{offer ? formatCurrency(getEffectivePrice(offer)) : "—"}</strong>{offer && <a href={safeExternalUrl(offer.productUrl)} target="_blank" rel="noopener noreferrer sponsored" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-bold hover:bg-slate-800">Comprar <ExternalLink size={15} /></a>}</div></article>;
        })}</div>
        <aside className="surface h-fit rounded-lg p-5 lg:sticky lg:top-24"><p className="text-sm text-slate-500">Total de referência</p><p className="mt-1 text-4xl font-black">{formatCurrency(total)}</p><div className="my-5 border-t border-slate-800" /><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-400"><Zap size={17} className="text-cyan-300" /> Consumo estimado</span><strong>{calculateEstimatedWatts(build.components)} W</strong></div><div className="mt-3 flex items-center justify-between"><span className="text-sm text-slate-400">Fonte indicada</span><strong>{calculateRecommendedPsuWatts(build.components)} W</strong></div><p className="mt-4 text-xs leading-5 text-slate-500">Estimativas com margem; confirme especificações e preços nas fontes oficiais.</p><Link href="/montar" className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-cyan-300 font-bold text-slate-950 hover:bg-cyan-200">Criar minha montagem</Link></aside>
      </div>
    </div>
  );
}
