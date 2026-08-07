import type { Metadata } from "next";
import { IntegrationsDashboard } from "@/features/admin/integrations-dashboard";
import { requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Integrações" };

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ oauth?: string }> }) {
  const access = await requireAdmin();
  const oauth = (await searchParams).oauth;
  return <><p className="heading-label">Catálogo real</p><h1 className="mt-2 text-3xl font-black tracking-tight">Integrações</h1><p className="mb-7 mt-2 text-slate-400">Conectores oficiais, feeds autorizados, sincronizações, correspondências e saúde das fontes.</p>{oauth && <p className={`mb-5 rounded-md border p-3 text-sm ${oauth === "success" ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-200" : "border-rose-400/20 bg-rose-400/5 text-rose-200"}`}>{oauth === "success" ? "Mercado Livre conectado com segurança." : oauth === "invalid" ? "Retorno OAuth inválido ou expirado." : "Não foi possível concluir o OAuth do Mercado Livre."}</p>}{access.demoMode ? <div className="rounded-md border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-amber-100">Configure o Supabase, aplique as migrations e entre como administrador para operar integrações.</div> : <IntegrationsDashboard />}</>;
}
