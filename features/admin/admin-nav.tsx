import Link from "next/link";
import { Boxes, Building2, Gauge, PlugZap, Tags } from "lucide-react";

const links = [
  { href: "/admin", label: "Visão geral", icon: Gauge },
  { href: "/admin/integracoes", label: "Integrações", icon: PlugZap },
  { href: "/admin/componentes", label: "Componentes", icon: Boxes },
  { href: "/admin/lojas", label: "Lojas", icon: Building2 },
  { href: "/admin/ofertas", label: "Ofertas", icon: Tags }
];

export function AdminNav() {
  return <nav className="scrollbar-thin -mx-3 flex gap-2 overflow-x-auto px-3 lg:mx-0 lg:grid lg:overflow-visible lg:px-0" aria-label="Navegação administrativa">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex shrink-0 items-center gap-2 rounded-md border border-transparent px-3 py-2.5 text-sm font-bold text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-white"><Icon size={17} />{label}</Link>)}</nav>;
}
