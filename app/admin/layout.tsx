import type { Metadata } from "next";
import { AdminNav } from "@/features/admin/admin-nav";

export const metadata: Metadata = { title: { default: "Administração", template: "%s | Admin" }, robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="container-shell py-8"><div className="grid gap-7 lg:grid-cols-[200px_1fr]"><aside><p className="mb-4 px-3 text-xs font-black uppercase tracking-widest text-slate-600">Painel</p><AdminNav /></aside><div className="min-w-0">{children}</div></div></div>;
}
