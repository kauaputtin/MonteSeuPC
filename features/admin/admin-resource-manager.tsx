"use client";

import { ChevronLeft, ChevronRight, Edit3, Plus, Search, ToggleLeft, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { categories } from "@/data/mock-data";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export type AdminResource = "componentes" | "lojas" | "ofertas";
export interface AdminRow { id: string; title: string; subtitle: string; value?: number; active: boolean; updatedAt: string; raw: Record<string, unknown>; }

interface FormValues {
  brand: string; name: string; slug: string; categorySlug: string; description: string; imageUrl: string; estimatedWatts: string; specifications: string;
  websiteUrl: string; logoUrl: string; componentId: string; storeId: string; price: string; pixPrice: string; productUrl: string;
  active: boolean; affiliate: boolean; available: boolean;
}

const defaults: FormValues = { brand: "", name: "", slug: "", categorySlug: "processador", description: "", imageUrl: "", estimatedWatts: "0", specifications: "{}", websiteUrl: "", logoUrl: "", componentId: "", storeId: "", price: "", pixPrice: "", productUrl: "", active: true, affiliate: false, available: true };
const text = z.string().trim().min(2);

function normalizeDbRow(resource: AdminResource, raw: Record<string, unknown>): AdminRow {
  if (resource === "ofertas") return { id: String(raw.id), title: `Oferta ${String(raw.id).slice(0, 8)}`, subtitle: String(raw.product_url ?? ""), value: Number(raw.pix_price ?? raw.price ?? 0), active: Boolean(raw.available), updatedAt: String(raw.updated_at ?? raw.last_checked_at ?? new Date().toISOString()), raw };
  return { id: String(raw.id), title: String(raw.name), subtitle: resource === "componentes" ? String(raw.brand ?? "") : String(raw.website_url ?? ""), active: Boolean(raw.active), updatedAt: String(raw.updated_at ?? raw.created_at ?? new Date().toISOString()), raw };
}

export function AdminResourceManager({ resource, initialRows, demoMode }: { resource: AdminResource; initialRows: AdminRow[]; demoMode: boolean }) {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminRow | null | undefined>(undefined);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({ defaultValues: defaults });
  const pageSize = 8;
  const filtered = useMemo(() => rows.filter((row) => `${row.title} ${row.subtitle}`.toLowerCase().includes(search.toLowerCase()) && (status === "all" || row.active === (status === "active"))), [rows, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (demoMode) return;
    const controller = new AbortController();
    fetch(`/api/admin/${resource}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Falha ao carregar registros.");
        return response.json() as Promise<{ items: Record<string, unknown>[] }>;
      })
      .then((data) => setRows(data.items.map((item) => normalizeDbRow(resource, item))))
      .catch((error: unknown) => { if (error instanceof Error && error.name !== "AbortError") toast.error(error.message); });
    return () => controller.abort();
  }, [demoMode, resource]);

  function startCreate() { reset(defaults); setEditing(null); }
  function startEdit(row: AdminRow) {
    const r = row.raw;
    reset({ ...defaults, brand: String(r.brand ?? ""), name: String(r.name ?? ""), slug: String(r.slug ?? ""), categorySlug: String(r.category_slug ?? "processador"), description: String(r.description ?? ""), imageUrl: String(r.image_url ?? ""), estimatedWatts: String(r.estimated_watts ?? 0), specifications: JSON.stringify(r.specifications ?? {}, null, 2), websiteUrl: String(r.website_url ?? ""), logoUrl: String(r.logo_url ?? ""), componentId: String(r.component_id ?? ""), storeId: String(r.store_id ?? ""), price: String(r.price ?? ""), pixPrice: String(r.pix_price ?? ""), productUrl: String(r.product_url ?? ""), active: Boolean(r.active), affiliate: Boolean(r.affiliate), available: Boolean(r.available) }); setEditing(row);
  }

  async function submit(values: FormValues) {
    if (demoMode) return toast.info("Modo demonstração: configure o Supabase para gravar alterações.");
    let payload: Record<string, unknown>;
    try {
      if (resource === "componentes") {
        z.object({ brand: text, name: text, slug: z.string().regex(/^[a-z0-9-]+$/), description: z.string().min(10), imageUrl: z.string().min(1), estimatedWatts: z.coerce.number().nonnegative() }).parse(values);
        payload = { brand: values.brand, name: values.name, slug: values.slug, categorySlug: values.categorySlug, description: values.description, imageUrl: values.imageUrl, estimatedWatts: Number(values.estimatedWatts), specifications: JSON.parse(values.specifications), active: values.active };
      } else if (resource === "lojas") {
        z.object({ name: text, slug: z.string().regex(/^[a-z0-9-]+$/), websiteUrl: z.url() }).parse(values);
        payload = { name: values.name, slug: values.slug, websiteUrl: values.websiteUrl, logoUrl: values.logoUrl || null, active: values.active };
      } else {
        z.object({ componentId: text, storeId: text, price: z.coerce.number().positive(), productUrl: z.url() }).parse(values);
        payload = { componentId: values.componentId, storeId: values.storeId, price: Number(values.price), pixPrice: values.pixPrice ? Number(values.pixPrice) : null, productUrl: values.productUrl, affiliate: values.affiliate, available: values.available };
      }
    } catch { return toast.error("Revise os campos e o JSON de especificações."); }
    const response = await fetch(`/api/admin/${resource}${editing ? `?id=${editing.id}` : ""}`, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json() as { item?: Record<string, unknown>; error?: string };
    if (!response.ok || !data.item) return toast.error(data.error || "Não foi possível salvar.");
    const normalized = normalizeDbRow(resource, data.item);
    setRows((current) => editing ? current.map((row) => row.id === editing.id ? normalized : row) : [normalized, ...current]);
    setEditing(undefined); toast.success(editing ? "Registro atualizado." : "Registro criado.");
  }

  async function deactivate(row: AdminRow) {
    if (!window.confirm(`Desativar “${row.title}”?`)) return;
    if (demoMode) return toast.info("Modo demonstração: nenhuma alteração foi gravada.");
    const response = await fetch(`/api/admin/${resource}?id=${row.id}`, { method: "DELETE" });
    if (!response.ok) return toast.error("Não foi possível desativar.");
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, active: false } : item)); toast.success("Registro desativado.");
  }

  return <div>
    {demoMode && <div className="mb-5 rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-100">Modo demonstração somente leitura. Configure o Supabase para habilitar gravações e autenticação.</div>}
    <div className="surface grid gap-3 rounded-lg p-3 sm:grid-cols-[1fr_180px_auto]"><label className="relative"><span className="sr-only">Buscar registros</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar..." className="h-11 w-full rounded-md border border-slate-700 bg-slate-950 pl-10 pr-3 text-sm" /></label><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-11 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"><option value="all">Todos os estados</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select><Button onClick={startCreate}><Plus size={17} /> Novo registro</Button></div>
    <div className="surface mt-4 overflow-hidden rounded-lg"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Registro</th><th className="px-4 py-3">Estado</th>{resource === "ofertas" && <th className="px-4 py-3">Valor</th>}<th className="px-4 py-3">Atualização</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody>{pageRows.map((row) => <tr key={row.id} className="border-t border-slate-800"><td className="px-4 py-4"><p className="font-bold">{row.title}</p><p className="mt-1 max-w-md truncate text-xs text-slate-500">{row.subtitle}</p></td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.active ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>{row.active ? "Ativo" : "Inativo"}</span></td>{resource === "ofertas" && <td className="px-4 py-4 font-bold">{formatCurrency(row.value ?? 0)}</td>}<td className="px-4 py-4 text-slate-400">{formatDateTime(row.updatedAt)}</td><td className="px-4 py-4"><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => startEdit(row)}><Edit3 size={15} /> Editar</Button><Button size="sm" variant="danger" disabled={!row.active} onClick={() => deactivate(row)}><ToggleLeft size={15} /> Desativar</Button></div></td></tr>)}</tbody></table>{pageRows.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Nenhum registro encontrado.</p>}</div><div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-sm text-slate-500"><span>{filtered.length} registro(s)</span><div className="flex items-center gap-3"><button aria-label="Página anterior" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></button><span>{page} / {totalPages}</span><button aria-label="Próxima página" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight /></button></div></div></div>
    {editing !== undefined && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3" role="presentation"><form onSubmit={handleSubmit(submit)} role="dialog" aria-modal="true" aria-labelledby="admin-form-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-5 shadow-2xl"><div className="flex justify-between gap-4"><div><p className="heading-label">{editing ? "Editar" : "Cadastrar"}</p><h2 id="admin-form-title" className="mt-1 text-xl font-black">{resource}</h2></div><Button type="button" size="sm" variant="ghost" onClick={() => setEditing(undefined)} aria-label="Fechar formulário"><X /></Button></div><div className="mt-6 grid gap-4 sm:grid-cols-2">
      {resource === "componentes" && <><Field label="Fabricante"><input {...register("brand")} /></Field><Field label="Modelo"><input {...register("name")} /></Field><Field label="Slug"><input {...register("slug")} /></Field><Field label="Categoria"><select {...register("categorySlug")}>{categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></Field><Field label="URL ou caminho da imagem"><input {...register("imageUrl")} /></Field><Field label="Consumo estimado (W)"><input type="number" {...register("estimatedWatts")} /></Field><Field label="Descrição" wide><textarea rows={3} {...register("description")} /></Field><Field label="Especificações (JSON)" wide><textarea rows={8} className="font-mono text-xs" {...register("specifications")} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("active")} /> Produto ativo</label></>}
      {resource === "lojas" && <><Field label="Nome"><input {...register("name")} /></Field><Field label="Slug"><input {...register("slug")} /></Field><Field label="Site"><input type="url" {...register("websiteUrl")} /></Field><Field label="URL do logo"><input type="url" {...register("logoUrl")} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("active")} /> Loja ativa</label></>}
      {resource === "ofertas" && <><Field label="ID do componente"><input {...register("componentId")} /></Field><Field label="ID da loja"><input {...register("storeId")} /></Field><Field label="Preço"><input type="number" step="0.01" {...register("price")} /></Field><Field label="Preço no Pix"><input type="number" step="0.01" {...register("pixPrice")} /></Field><Field label="Link do produto" wide><input type="url" {...register("productUrl")} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("affiliate")} /> Link afiliado</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("available")} /> Oferta disponível</label></>}
    </div><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(undefined)}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar"}</Button></div></form></div>}
  </div>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactElement<{ className?: string }> }) {
  return <label className={`text-sm font-bold ${wide ? "sm:col-span-2" : ""}`}>{label}{children && <span className="mt-2 block [&>*]:w-full [&>*]:rounded-md [&>*]:border [&>*]:border-slate-700 [&>*]:bg-slate-900 [&>*]:px-3 [&>*]:py-2.5 [&>*]:font-normal">{children}</span>}</label>;
}
