import { NextResponse } from "next/server";
import { z } from "zod";
import { auditAdminAction, getAdminApiContext } from "@/lib/admin-api";

export async function GET() {
  const context = await getAdminApiContext();
  if (!context) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const [providers, products, sources, jobs, batches] = await Promise.all([
    context.supabase.from("integration_providers").select("*").order("name"),
    context.supabase.from("external_products").select("provider_id"),
    context.supabase.from("offer_sources").select("provider_id,offer_id"),
    context.supabase.from("sync_jobs").select("*").order("started_at", { ascending: false }).limit(100),
    context.supabase.from("csv_import_batches").select("*").order("created_at", { ascending: false }).limit(20)
  ]);
  if (providers.error || products.error || sources.error || jobs.error || batches.error) return NextResponse.json({ error: "A migration de integrações ainda não foi aplicada ou a consulta falhou." }, { status: 500 });
  const items = (providers.data ?? []).map((provider) => {
    const providerSources = (sources.data ?? []).filter((item) => item.provider_id === provider.id);
    const lastJob = (jobs.data ?? []).find((item) => item.provider_id === provider.id) ?? null;
    return {
      ...provider,
      products_count: (products.data ?? []).filter((item) => item.provider_id === provider.id).length,
      offers_count: providerSources.length,
      published_offers_count: providerSources.filter((item) => item.offer_id).length,
      errors_count: Number(lastJob?.errors_count ?? 0),
      last_job: lastJob
    };
  });
  return NextResponse.json({ items, jobs: jobs.data ?? [], batches: (batches.data ?? []).map((batch) => ({ ...batch, can_revert: !batch.reverted_at && Date.parse(batch.reversible_until) > Date.now() })) });
}

const updateSchema = z.object({ id: z.string().min(2).max(60), enabled: z.boolean().optional(), syncIntervalMinutes: z.number().int().min(15).max(43_200).optional() }).refine((value) => value.enabled !== undefined || value.syncIntervalMinutes !== undefined);

export async function PATCH(request: Request) {
  const context = await getAdminApiContext();
  if (!context) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const update: Record<string, unknown> = {};
  if (parsed.data.enabled !== undefined) { update.enabled = parsed.data.enabled; if (!parsed.data.enabled) update.configuration_status = "disabled"; }
  if (parsed.data.syncIntervalMinutes !== undefined) update.sync_interval_minutes = parsed.data.syncIntervalMinutes;
  const { data, error } = await context.supabase.from("integration_providers").update(update).eq("id", parsed.data.id).select("*").single();
  if (error) return NextResponse.json({ error: "Não foi possível atualizar a fonte." }, { status: 400 });
  await auditAdminAction(context, "integration.update", "integration_provider", parsed.data.id, update);
  return NextResponse.json({ item: data });
}
