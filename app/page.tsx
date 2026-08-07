import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, CheckCircle2, ChevronRight, Cpu, ExternalLink, GitCompareArrows,
  MemoryStick, MousePointerClick, PackageCheck, SearchCheck, ShieldCheck, ShoppingCart
} from "lucide-react";
import { categories, components, demoBuilds, getOffersForComponent } from "@/data/mock-data";
import { formatCurrency } from "@/lib/utils";

const benefits = [
  { icon: ShieldCheck, title: "Compatibilidade verificada", text: "O montador cruza socket, memória, dimensões, energia e conectores a cada escolha." },
  { icon: GitCompareArrows, title: "Comparação de preços", text: "Compare ofertas importadas de fontes autorizadas e selecione a loja para cada componente." },
  { icon: ShoppingCart, title: "Links diretos para compra", text: "Finalize sua lista e abra as páginas das lojas com segurança em uma nova aba." }
];

const steps = [
  { number: "01", icon: MousePointerClick, title: "Escolha a plataforma", text: "Comece pelo processador. As próximas listas se adaptam ao que você selecionou." },
  { number: "02", icon: SearchCheck, title: "Confira cada encaixe", text: "Veja avisos objetivos e a explicação de qualquer conflito antes de avançar." },
  { number: "03", icon: PackageCheck, title: "Compare e finalize", text: "Escolha ofertas, confira potência e total, salve e compartilhe a montagem." }
];

export default function HomePage() {
  const heroItems = ["cpu-am5-6", "mb-am5-ddr5-atx", "ram-ddr5-32", "gpu-180"]
    .map((id) => components.find((item) => item.id === id))
    .filter((item) => item !== undefined);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Monte Seu PC",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: "pt-BR",
    description: "Montador de computadores com validação de compatibilidade e comparação de ofertas."
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="hero-glow overflow-hidden border-b border-slate-800/80 py-16 sm:py-24 lg:py-28">
        <div className="container-shell grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div className="animate-enter">
            <p className="heading-label mb-5">Decisões técnicas, em linguagem simples</p>
            <h1 className="text-balance max-w-3xl text-4xl font-black leading-[1.05] tracking-[-.045em] text-white sm:text-6xl lg:text-7xl">Monte seu PC<br /><span className="text-cyan-300">sem medo de errar</span></h1>
            <p className="mt-6 max-w-2xl text-balance text-base leading-7 text-slate-300 sm:text-lg">Escolha cada peça com orientação de compatibilidade, compare ofertas e termine com uma lista clara de onde comprar.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/montar" className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-cyan-300 bg-cyan-300 px-5 font-extrabold text-slate-950 transition-colors hover:bg-cyan-200">Montar meu PC <ArrowRight size={19} /></Link>
              <Link href="#como-funciona" className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-600 bg-slate-900 px-5 font-bold text-slate-100 transition-colors hover:border-slate-400">Como funciona <ChevronRight size={18} /></Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Sem cadastro</span>
              <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Salvo no navegador</span>
              <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400" /> Dados demo identificados</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl animate-enter [animation-delay:120ms]">
            <div className="surface relative overflow-hidden rounded-xl p-4 shadow-2xl shadow-cyan-950/20 sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-slate-700 pb-4">
                <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Montagem em andamento</p><p className="mt-1 font-bold">PC equilibrado</p></div>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">Tudo compatível</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {heroItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-md border border-slate-700/80 bg-slate-950/70 p-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded bg-slate-900"><Image src={item.imageUrl} fill alt={`Ilustração demonstrativa de ${item.name}`} className="object-cover" sizes="48px" /></div>
                    <div className="min-w-0"><p className="truncate text-xs text-slate-500">{categories.find((category) => category.slug === item.categorySlug)?.name}</p><p className="truncate text-sm font-bold">{item.name}</p></div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 rounded-md bg-cyan-300/8 p-4">
                <div><p className="text-xs text-slate-400">Consumo estimado</p><p className="mt-1 text-xl font-black">413 W</p></div>
                <div><p className="text-xs text-slate-400">Fonte recomendada</p><p className="mt-1 text-xl font-black text-cyan-300">550 W</p></div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-md border border-slate-700 bg-slate-950 px-4 py-3 shadow-xl sm:-left-8"><Cpu className="text-cyan-300" /><div><p className="text-xs text-slate-500">Verificação ativa</p><p className="text-sm font-bold">15 regras analisadas</p></div></div>
          </div>
        </div>
      </section>

      <section className="container-shell py-20" aria-labelledby="beneficios">
        <p className="heading-label">O essencial, bem resolvido</p>
        <h2 id="beneficios" className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Escolhas mais seguras do primeiro clique à compra</h2>
        <div className="mt-9 grid gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800 md:grid-cols-3">
          {benefits.map(({ icon: Icon, title, text }) => (
            <article key={title} className="bg-[#0b0f15] p-6 sm:p-8">
              <Icon className="mb-5 text-cyan-300" size={28} strokeWidth={1.8} /><h3 className="text-lg font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="border-y border-slate-800 bg-slate-950/55 py-20 scroll-mt-20">
        <div className="container-shell">
          <div className="grid gap-10 lg:grid-cols-[.65fr_1.35fr]">
            <div><p className="heading-label">Como funciona</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Um passo por vez.<br />Sem caixa-preta.</h2><p className="mt-4 max-w-md leading-7 text-slate-400">Cada alerta explica o que está acontecendo para você decidir com contexto.</p></div>
            <ol className="grid gap-4">
              {steps.map(({ number, icon: Icon, title, text }) => (
                <li key={number} className="surface grid grid-cols-[auto_1fr] gap-4 rounded-lg p-5 sm:grid-cols-[55px_45px_1fr] sm:items-center">
                  <span className="text-sm font-black text-slate-600">{number}</span><Icon className="hidden text-cyan-300 sm:block" size={25} /><div><h3 className="font-extrabold">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="exemplos" className="container-shell py-20 scroll-mt-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="heading-label">Pontos de partida</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Configurações de exemplo</h2></div><p className="text-sm text-slate-500">Produtos e preços fictícios para demonstração</p></div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {demoBuilds.map((build) => {
            const buildComponents = build.componentIds.map((id) => components.find((item) => item.id === id)).filter((item) => item !== undefined);
            const total = buildComponents.reduce((sum, item) => sum + (getOffersForComponent(item.id)[0]?.pixPrice ?? getOffersForComponent(item.id)[0]?.price ?? 0), 0);
            return (
              <article key={build.name} className="surface rounded-lg p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-black">{build.name}</h3><p className="mt-1 text-sm text-slate-400">{build.description}</p></div><MemoryStick className="shrink-0 text-cyan-300" /></div>
                <div className="my-5 flex -space-x-2">{buildComponents.slice(0, 6).map((item) => <div key={item.id} className="relative size-11 overflow-hidden rounded-full border-2 border-slate-900 bg-slate-800"><Image src={item.imageUrl} fill alt="" className="object-cover" sizes="44px" /></div>)}</div>
                <div className="flex items-end justify-between border-t border-slate-800 pt-4"><div><p className="text-xs text-slate-500">Referência demonstrativa</p><p className="mt-1 text-xl font-black">{formatCurrency(total)}</p></div><Link href="/montar" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300 hover:text-cyan-200">Usar como inspiração <ArrowRight size={17} /></Link></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="container-shell pb-8">
        <div className="flex gap-3 rounded-md border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100/80"><ExternalLink className="mt-0.5 shrink-0 text-amber-300" size={18} /><p>As configurações de exemplo acima são fictícias. No catálogo conectado, preços e disponibilidade também podem mudar; confirme os valores diretamente no site da loja antes de comprar.</p></div>
      </section>
    </>
  );
}
