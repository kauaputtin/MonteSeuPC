import Link from "next/link";
import { Cpu, Menu } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#07090c]/90 backdrop-blur-xl">
      <div className="container-shell flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight" aria-label="Monte Seu PC — início">
          <span className="grid size-9 place-items-center rounded-md border border-cyan-300/40 bg-cyan-300/10 text-cyan-300"><Cpu size={20} /></span>
          <span>Monte Seu <span className="text-cyan-300">PC</span></span>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Beta</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-300 md:flex" aria-label="Navegação principal">
          <Link className="transition-colors hover:text-cyan-300" href="/#como-funciona">Como funciona</Link>
          <Link className="transition-colors hover:text-cyan-300" href="/produtos">Produtos reais</Link>
          <Link className="transition-colors hover:text-cyan-300" href="/#exemplos">Exemplos</Link>
          <Link className="transition-colors hover:text-cyan-300" href="/admin">Admin</Link>
          <Link className="rounded-md bg-cyan-300 px-4 py-2.5 font-extrabold text-slate-950 transition-colors hover:bg-cyan-200" href="/montar">Montar meu PC</Link>
        </nav>
        <details className="relative md:hidden">
          <summary className="grid size-10 list-none place-items-center rounded-md border border-slate-700 text-slate-200" aria-label="Abrir menu"><Menu /></summary>
          <nav className="absolute right-0 top-12 grid min-w-52 gap-1 rounded-md border border-slate-700 bg-slate-950 p-2 shadow-2xl" aria-label="Navegação móvel">
            <Link className="rounded px-3 py-2 hover:bg-slate-800" href="/#como-funciona">Como funciona</Link>
            <Link className="rounded px-3 py-2 hover:bg-slate-800" href="/produtos">Produtos reais</Link>
            <Link className="rounded px-3 py-2 hover:bg-slate-800" href="/#exemplos">Exemplos</Link>
            <Link className="rounded px-3 py-2 hover:bg-slate-800" href="/admin">Admin</Link>
            <Link className="rounded bg-cyan-300 px-3 py-2 font-bold text-slate-950" href="/montar">Montar meu PC</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
