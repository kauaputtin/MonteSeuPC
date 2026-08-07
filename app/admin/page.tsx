import Link from "next/link";
import { Boxes, Building2, Database, LockKeyhole, Tags } from "lucide-react";
import { components, offers, stores } from "@/data/mock-data";
import { requireAdmin } from "@/lib/supabase/auth";

export default async function AdminPage() {
  const access = await requireAdmin();
  const cards = [{ href: "/admin/componentes", label: "Componentes", count: components.length, icon: Boxes }, { href: "/admin/lojas", label: "Lojas", count: stores.length, icon: Building2 }, { href: "/admin/ofertas", label: "Ofertas", count: offers.length, icon: Tags }];
  return <><p className="heading-label">Operação do catálogo</p><h1 className="mt-2 text-3xl font-black tracking-tight">Visão geral</h1><p className="mt-2 text-slate-400">Gerencie o catálogo, parceiros e condições comerciais.</p>{access.demoMode && <div className="mt-6 flex gap-3 rounded-md border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100"><Database className="shrink-0" size={20} /> Dados locais de demonstração. Configure o Supabase para autenticar administradores e persistir alterações.</div>}<div className="mt-7 grid gap-4 sm:grid-cols-3">{cards.map(({ href, label, count, icon: Icon }) => <Link href={href} key={href} className="surface rounded-lg p-5 transition-colors hover:border-cyan-300/30"><Icon className="text-cyan-300" /><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{count}</p><p className="mt-4 text-xs font-bold text-cyan-300">Abrir gerenciamento →</p></Link>)}</div><div className="surface mt-6 flex gap-3 rounded-lg p-5"><LockKeyhole className="shrink-0 text-emerald-400" /><div><h2 className="font-bold">Acesso protegido</h2><p className="mt-1 text-sm leading-6 text-slate-400">Quando conectado, o acesso depende do Supabase Auth e de um perfil com função <code>admin</code> ou <code>editor</code>. A service role nunca é enviada ao navegador.</p></div></div></>;
}
