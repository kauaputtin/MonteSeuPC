import Link from "next/link";
import { Cpu } from "lucide-react";

export default function NotFound() {
  return <div className="container-shell grid min-h-[60vh] place-items-center py-16 text-center"><div><Cpu className="mx-auto text-cyan-300" size={42} /><p className="heading-label mt-6">Erro 404</p><h1 className="mt-2 text-4xl font-black">Esta peça não encaixa aqui</h1><p className="mx-auto mt-3 max-w-md leading-7 text-slate-400">A página não existe, foi removida ou o link compartilhado não é mais válido.</p><Link href="/" className="mt-7 inline-flex h-11 items-center rounded-md bg-cyan-300 px-5 font-bold text-slate-950">Voltar ao início</Link></div></div>;
}
