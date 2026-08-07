import Link from "next/link";
import { Cpu } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-slate-800 bg-slate-950/40">
      <div className="container-shell grid gap-8 py-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 font-black"><Cpu className="text-cyan-300" size={20} /> Monte Seu PC</div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">Ferramenta independente de apoio à escolha. Dados e preços deste ambiente são demonstrativos; confirme condições e compatibilidade final com fabricantes e lojas.</p>
        </div>
        <nav className="flex gap-5 text-sm text-slate-400" aria-label="Links do rodapé">
          <Link href="/montar" className="hover:text-white">Montador</Link>
          <Link href="/admin" className="hover:text-white">Admin</Link>
        </nav>
      </div>
    </footer>
  );
}
