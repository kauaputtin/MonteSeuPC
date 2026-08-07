import { NextResponse } from "next/server";
import { z } from "zod";
import { auditAdminAction, getAdminApiContext } from "@/lib/admin-api";

const schema = z.object({ batchId: z.string().min(1) });

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if (!context) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Lote inválido." }, { status: 400 });
  const { data: batch } = await context.supabase.from("csv_import_batches").select("*,sync_jobs(started_at)").eq("id", parsed.data.batchId).maybeSingle();
  if (!batch || batch.reverted_at || Date.parse(batch.reversible_until) < Date.now()) return NextResponse.json({ error: "Este lote não pode mais ser desfeito." }, { status: 409 });
  const startedAt = (batch.sync_jobs as { started_at?: string } | null)?.started_at;
  if (!startedAt) return NextResponse.json({ error: "Job do lote não encontrado." }, { status: 404 });
  const { data: sources } = await context.supabase.from("offer_sources").select("id,offer_id,created_at").eq("sync_job_id", batch.sync_job_id).gte("created_at", startedAt);
  const offerIds = (sources ?? []).flatMap((source) => source.offer_id ? [String(source.offer_id)] : []);
  if (offerIds.length) await context.supabase.from("offers").delete().in("id", offerIds);
  if (sources?.length) await context.supabase.from("offer_sources").delete().in("id", sources.map((source) => source.id));
  const { data: products } = await context.supabase.from("external_products").select("id,created_at").eq("sync_job_id", batch.sync_job_id).gte("created_at", startedAt);
  if (products?.length) await context.supabase.from("external_products").delete().in("id", products.map((product) => product.id));
  await context.supabase.from("csv_import_batches").update({ reverted_at: new Date().toISOString() }).eq("id", batch.id);
  await auditAdminAction(context, "csv.undo", "csv_import_batch", String(batch.id), { removedOffers: offerIds.length, removedProducts: products?.length ?? 0, partial: true });
  return NextResponse.json({ ok: true, removedOffers: offerIds.length, removedProducts: products?.length ?? 0, message: "Registros criados pelo lote foram removidos. Atualizações sobre registros anteriores não são revertidas." });
}
