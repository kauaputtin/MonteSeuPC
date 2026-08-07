"use client";

import Link from "next/link";
import { Activity, Check, Download, FileUp, HeartPulse, Link2, LoaderCircle, Play, RotateCcw, Unlink, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

interface ProviderRow {
  id: string; name: string; integration_type: string; enabled: boolean; configuration_status: string; sync_interval_minutes: number;
  last_success_at?: string | null; last_failure_at?: string | null; last_error?: string | null; next_sync_at?: string | null;
  products_count: number; offers_count: number; errors_count: number; last_job?: Job | null;
}
interface Job { id: string; provider_id: string; status: string; started_at: string; finished_at?: string; items_found: number; items_created: number; items_updated: number; errors_count: number; error_message?: string; }
interface Batch { id: string; file_name: string; created_at: string; reversible_until: string; reverted_at?: string | null; can_revert: boolean; }
interface Candidate { id: string; component_id: string; confidence: number; match_reasons: string[]; status: string; }
interface MatchItem { id: string; provider_id: string; title: string; brand?: string; model?: string; match_status: string; match_confidence?: number; specifications: unknown; normalized_specifications: unknown; raw_payload: unknown; product_match_candidates: Candidate[]; }
interface ComponentName { id: string; brand: string; name: string; }
interface CsvError { line: number; messages: string[]; }

const canonicalColumns = ["store", "external_id", "brand", "model", "title", "category", "gtin", "mpn", "specifications", "price", "pix_price", "available", "condition", "product_url", "image_url", "updated_at"];
const statusLabel: Record<string, string> = { configured: "Configurada", missing_credentials: "Credenciais ausentes", manual_only: "Somente manual", disabled: "Desativada", error: "Com erro" };
const mercadoLivreCallbackPath = "/api/integrations/mercado-livre/callback";
const subscribeToOrigin = () => () => undefined;

async function fetchDashboardData() {
  const [integrationResponse, matchResponse] = await Promise.all([fetch("/api/admin/integrations", { cache: "no-store" }), fetch("/api/admin/integrations/matches", { cache: "no-store" })]);
  const integrationData = await integrationResponse.json(); const matchData = await matchResponse.json();
  if (!integrationResponse.ok) throw new Error(integrationData.error);
  return { integrationData, matchData, matchesOk: matchResponse.ok };
}

export function IntegrationsDashboard() {
  const [providers, setProviders] = useState<ProviderRow[]>([]); const [jobs, setJobs] = useState<Job[]>([]); const [batches, setBatches] = useState<Batch[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]); const [componentNames, setComponentNames] = useState<ComponentName[]>([]);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState<string | null>(null);
  const [fileName, setFileName] = useState(""); const [csv, setCsv] = useState(""); const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); const [csvErrors, setCsvErrors] = useState<CsvError[]>([]); const [validRows, setValidRows] = useState(0); const [totalRows, setTotalRows] = useState(0); const [allowPartial, setAllowPartial] = useState(false);
  const mercadoLivreOrigin = useSyncExternalStore(subscribeToOrigin, () => window.location.origin, () => "");
  const mercadoLivreCallback = `${mercadoLivreOrigin}${mercadoLivreCallbackPath}`;

  const load = useCallback(async () => {
    try {
      const { integrationData, matchData, matchesOk } = await fetchDashboardData();
      setProviders(integrationData.items); setJobs(integrationData.jobs); setBatches(integrationData.batches);
      if (matchesOk) { setMatches(matchData.items); setComponentNames(matchData.components); }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao carregar integrações."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    void fetchDashboardData().then(({ integrationData, matchData, matchesOk }) => {
      if (!active) return;
      setProviders(integrationData.items); setJobs(integrationData.jobs); setBatches(integrationData.batches);
      if (matchesOk) { setMatches(matchData.items); setComponentNames(matchData.components); }
    }).catch((error: unknown) => { if (active) toast.error(error instanceof Error ? error.message : "Falha ao carregar integrações."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function providerAction(providerId: string, action: "health" | "sync") {
    setBusy(`${providerId}:${action}`);
    try {
      const response = await fetch(`/api/admin/integrations/${providerId}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      toast.success(action === "health" ? data.health.message : `Sincronização ${data.status}: ${data.metrics.itemsFound} produtos encontrados e ${data.metrics.errorsCount} erros. Itens sem correspondência ficam na fila de revisão.`); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha na ação."); }
    finally { setBusy(null); }
  }

  async function updateProvider(provider: ProviderRow, values: Record<string, unknown>) {
    setBusy(`${provider.id}:update`);
    const response = await fetch("/api/admin/integrations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: provider.id, ...values }) });
    const data = await response.json();
    if (!response.ok) toast.error(data.error); else { toast.success("Fonte atualizada."); await load(); }
    setBusy(null);
  }

  async function previewCsv() {
    if (!csv) return toast.error("Selecione um arquivo CSV.");
    setBusy("csv:preview");
    const response = await fetch("/api/admin/integrations/csv/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: csv, mapping }) });
    const data = await response.json();
    if (!response.ok) toast.error(data.error); else { setHeaders(data.headers); setCsvErrors(data.errors); setValidRows(data.validRows); setTotalRows(data.totalRows); toast.success("Prévia validada."); }
    setBusy(null);
  }

  async function importCsv() {
    setBusy("csv:import");
    const response = await fetch("/api/admin/integrations/csv/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName, content: csv, mapping, allowPartial }) });
    const data = await response.json();
    if (!response.ok) toast.error(data.error); else { toast.success(`Importação ${data.status}: ${data.metrics.itemsFound} produtos processados.`); setCsv(""); setFileName(""); setHeaders([]); await load(); }
    setBusy(null);
  }

  async function review(action: "approve" | "reject" | "separate" | "undo" | "renormalize", candidateId?: string, externalProductId?: string) {
    setBusy(candidateId ?? `${externalProductId}:${action}`);
    const response = await fetch("/api/admin/integrations/matches", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, candidateId, externalProductId }) });
    const data = await response.json(); if (!response.ok) toast.error(data.error); else { toast.success("Revisão registrada."); await load(); } setBusy(null);
  }

  async function undoBatch(batchId: string) {
    if (!window.confirm("Desfazer os registros novos desta importação? Atualizações sobre registros anteriores não podem ser restauradas.")) return;
    setBusy(`batch:${batchId}`); const response = await fetch("/api/admin/integrations/csv/undo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId }) });
    const data = await response.json(); if (!response.ok) toast.error(data.error); else { toast.success(data.message); await load(); } setBusy(null);
  }

  const names = useMemo(() => new Map(componentNames.map((component) => [component.id, `${component.brand} ${component.name}`])), [componentNames]);
  if (loading) return <div className="surface grid min-h-52 place-items-center rounded-lg"><LoaderCircle className="animate-spin text-cyan-300" /></div>;

  return <div className="space-y-8">
    <section><div className="mb-4 flex items-end justify-between gap-3"><div><p className="heading-label">Conectores</p><h2 className="mt-2 text-2xl font-black">Fontes cadastradas</h2></div><Link href="/admin/ofertas" className="text-sm font-bold text-cyan-300 hover:underline">Cadastrar oferta manual →</Link></div>
      <div className="space-y-3">{providers.map((provider) => { const needsConnection = provider.id === "mercado-livre" && provider.configuration_status === "missing_credentials"; return <article key={provider.id} className="surface rounded-lg p-4"><div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr_1fr_auto] xl:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{provider.name}</h3><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${provider.enabled ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{provider.enabled ? "Ativa" : "Inativa"}</span></div><p className="mt-1 text-xs text-slate-500">{provider.integration_type} · {statusLabel[provider.configuration_status] ?? provider.configuration_status}</p>{provider.last_error && <p className="mt-2 line-clamp-2 text-xs text-rose-300">{provider.last_error}</p>}</div><dl className="grid grid-cols-3 gap-2 text-center text-xs"><div><dt className="text-slate-500">Produtos</dt><dd className="mt-1 font-black">{provider.products_count}</dd></div><div><dt className="text-slate-500">Ofertas</dt><dd className="mt-1 font-black">{provider.offers_count}</dd></div><div><dt className="text-slate-500">Erros</dt><dd className="mt-1 font-black">{provider.errors_count}</dd></div></dl><div className="text-xs leading-5 text-slate-500"><p>Último sucesso: {provider.last_success_at ? formatDateTime(provider.last_success_at) : "—"}</p><p>Última execução: {provider.last_job ? `${provider.last_job.status} · ${formatDateTime(provider.last_job.started_at)}` : "—"}</p><p>Próxima: {provider.next_sync_at ? formatDateTime(provider.next_sync_at) : "aguardando agenda"}</p><label className="mt-1 flex items-center gap-2">Intervalo <input aria-label={`Intervalo de ${provider.name}`} className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1" type="number" min={15} defaultValue={provider.sync_interval_minutes} onBlur={(event) => { const value = Number(event.target.value); if (value !== provider.sync_interval_minutes) void updateProvider(provider, { syncIntervalMinutes: value }); }} /> min</label></div><div className="flex flex-wrap gap-2 xl:justify-end"><Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => providerAction(provider.id, "health")}><HeartPulse size={15} /> Testar</Button>{needsConnection && <Link prefetch={false} href="/api/admin/integrations/mercado-livre/connect" className="inline-flex h-9 items-center gap-2 rounded-md bg-cyan-300 px-3 text-sm font-bold text-slate-950"><Link2 size={15} /> Conectar</Link>}<Button size="sm" disabled={Boolean(busy) || !provider.enabled || !["mercado-livre", "mock"].includes(provider.id) || needsConnection} onClick={() => providerAction(provider.id, "sync")}><Play size={15} /> Sincronizar</Button><Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => updateProvider(provider, { enabled: !provider.enabled })}>{provider.enabled ? "Desativar" : "Ativar"}</Button></div></div>{needsConnection && <div className="mt-4 rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100"><strong>As chaves não importam anúncios sozinhas.</strong> Cadastre <code className="break-all text-amber-200">{mercadoLivreCallback}</code> como redirect URI no aplicativo do Mercado Livre e use exatamente o mesmo valor em <code>MERCADO_LIVRE_REDIRECT_URI</code>. Depois clique em <strong>Conectar</strong>, autorize a conta principal e, ao retornar, clique em <strong>Sincronizar</strong>.</div>}</article>; })}</div>
    </section>

    <section className="surface rounded-lg p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="heading-label">Feed autorizado</p><h2 className="mt-2 text-2xl font-black">Importar CSV</h2></div><Link prefetch={false} href="/api/admin/integrations/csv/example" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300"><Download size={16} /> Baixar exemplo</Link></div><p className="mt-2 text-sm text-slate-400">Envie apenas planilhas próprias ou feeds cuja utilização foi autorizada pela loja.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="flex min-h-24 flex-1 cursor-pointer items-center justify-center gap-3 rounded-md border border-dashed border-slate-700 bg-slate-950 p-4 text-sm text-slate-300"><FileUp /><span>{fileName || "Selecionar CSV (até 5 MB)"}</span><input className="sr-only" type="file" accept=".csv,text/csv" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setFileName(file.name); setCsv(await file.text()); setHeaders([]); setCsvErrors([]); }} /></label><Button disabled={!csv || Boolean(busy)} onClick={previewCsv}>{busy === "csv:preview" ? <LoaderCircle className="animate-spin" /> : <Activity />} Gerar prévia</Button></div>
      {headers.length > 0 && <><div className="mt-5"><h3 className="font-bold">Mapeamento de colunas</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{canonicalColumns.map((column) => <label key={column} className="text-xs text-slate-400">{column}<select className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-slate-200" value={mapping[column] ?? (headers.includes(column) ? column : "")} onChange={(event) => setMapping((current) => ({ ...current, [column]: event.target.value }))}><option value="">Não mapear</option>{headers.map((header) => <option key={header}>{header}</option>)}</select></label>)}</div><Button className="mt-3" size="sm" variant="secondary" onClick={previewCsv}>Revalidar mapeamento</Button></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Linhas" value={totalRows} /><Metric label="Válidas" value={validRows} /><Metric label="Com erro" value={csvErrors.length} /></div>{csvErrors.length > 0 && <div className="mt-4 max-h-44 overflow-y-auto rounded border border-rose-400/20 bg-rose-400/5 p-3 text-xs text-rose-200">{csvErrors.map((error) => <p key={`${error.line}-${error.messages.join()}`}>Linha {error.line}: {error.messages.join("; ")}</p>)}</div>}<label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={allowPartial} onChange={(event) => setAllowPartial(event.target.checked)} /> Importar linhas válidas mesmo quando houver erros</label><Button className="mt-4" disabled={!validRows || (csvErrors.length > 0 && !allowPartial) || Boolean(busy)} onClick={importCsv}>{busy === "csv:import" ? <LoaderCircle className="animate-spin" /> : <Check />} Confirmar importação</Button></>}
      {batches.length > 0 && <div className="mt-6 border-t border-slate-800 pt-4"><h3 className="font-bold">Importações recentes</h3><div className="mt-2 space-y-2">{batches.slice(0, 5).map((batch) => <div key={batch.id} className="flex flex-wrap items-center justify-between gap-3 rounded bg-slate-950 p-3 text-xs"><span>{batch.file_name} · {formatDateTime(batch.created_at)}</span><Button size="sm" variant="ghost" disabled={!batch.can_revert || Boolean(busy)} onClick={() => undoBatch(batch.id)}><RotateCcw size={14} /> {batch.reverted_at ? "Desfeita" : "Desfazer novos registros"}</Button></div>)}</div></div>}
    </section>

    <section><p className="heading-label">Correspondência</p><h2 className="mt-2 text-2xl font-black">Fila de revisão e possíveis duplicados</h2><p className="mt-2 text-sm text-slate-400">A semelhança textual nunca aprova sozinha. Confirme fabricante, modelo e variação antes de associar.</p><div className="mt-4 space-y-3">{matches.map((product) => <article key={product.id} className="surface rounded-lg p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold text-cyan-300">{product.provider_id} · {product.match_status}</p><h3 className="mt-1 font-black">{product.title}</h3><p className="mt-1 text-xs text-slate-500">{product.brand} {product.model} · confiança máxima {product.match_confidence ? `${Math.round(product.match_confidence * 100)}%` : "—"}</p></div><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => review("renormalize", undefined, product.id)}><RotateCcw size={14} /> Renormalizar</Button><Button size="sm" variant="ghost" onClick={() => review("undo", undefined, product.id)}><Unlink size={14} /> Desfazer vínculo</Button></div></div><details className="mt-3 rounded bg-slate-950 p-3 text-xs"><summary className="cursor-pointer font-bold">Comparar dado original e normalizado</summary><div className="mt-3 grid gap-3 lg:grid-cols-2"><pre className="overflow-auto whitespace-pre-wrap text-slate-400">{JSON.stringify(product.raw_payload ?? product.specifications, null, 2)}</pre><pre className="overflow-auto whitespace-pre-wrap text-emerald-200/70">{JSON.stringify(product.normalized_specifications, null, 2)}</pre></div></details><div className="mt-3 space-y-2">{(product.product_match_candidates ?? []).filter((candidate) => candidate.status === "pending").map((candidate) => <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-800 p-3 text-sm"><div><strong>{names.get(candidate.component_id) ?? candidate.component_id}</strong><p className="mt-1 text-xs text-slate-500">{Math.round(candidate.confidence * 100)}% · {(candidate.match_reasons ?? []).join(", ")}</p></div><div className="flex gap-2"><Button size="sm" disabled={Boolean(busy)} onClick={() => review("approve", candidate.id)}><Check size={14} /> Aprovar</Button><Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => review("reject", candidate.id)}><X size={14} /> Rejeitar</Button><Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => review("separate", candidate.id)}><Unlink size={14} /> Separar</Button></div></div>)}</div></article>)}{matches.length === 0 && <div className="surface rounded-lg p-8 text-center text-sm text-slate-500">Nenhum produto aguardando revisão.</div>}</div></section>

    <section><p className="heading-label">Monitoramento</p><h2 className="mt-2 text-2xl font-black">Execuções recentes</h2><div className="surface mt-4 overflow-x-auto rounded-lg"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-900 text-xs uppercase text-slate-500"><tr><th className="p-3">Fonte</th><th className="p-3">Estado</th><th className="p-3">Início</th><th className="p-3">Encontrados</th><th className="p-3">Criados / atualizados</th><th className="p-3">Erros</th></tr></thead><tbody>{jobs.slice(0, 20).map((job) => <tr key={job.id} className="border-t border-slate-800"><td className="p-3 font-bold">{job.provider_id}</td><td className="p-3">{job.status}</td><td className="p-3 text-slate-400">{formatDateTime(job.started_at)}</td><td className="p-3">{job.items_found}</td><td className="p-3">{job.items_created} / {job.items_updated}</td><td className="p-3 text-rose-300">{job.errors_count}</td></tr>)}</tbody></table></div></section>
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded bg-slate-950 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>; }
