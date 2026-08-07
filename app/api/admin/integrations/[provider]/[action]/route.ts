import { NextResponse } from "next/server";
import { z } from "zod";
import { SyncService } from "@/integrations/core/sync-service";
import { SupabaseSyncRepository } from "@/integrations/repositories/supabase-sync-repository";
import { getProviderRegistry } from "@/integrations/registry";
import { auditAdminAction, consumeAdminRateLimit, getAdminApiContext } from "@/lib/admin-api";

const bodySchema = z.object({ queries: z.array(z.string().trim().min(2).max(100)).min(1).max(25).optional(), pages: z.number().int().min(1).max(10).optional(), pageSize: z.number().int().min(1).max(20).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ provider: string; action: string }> }) {
  const context = await getAdminApiContext();
  if (!context) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { provider: providerId, action } = await params;
  if (!consumeAdminRateLimit(`${context.user.id}:${providerId}:${action}`)) return NextResponse.json({ error: "Limite temporário atingido. Aguarde antes de tentar novamente." }, { status: 429 });
  const provider = getProviderRegistry().get(providerId);
  if (!provider) return NextResponse.json({ error: "Provider desconhecido." }, { status: 404 });
  try {
    if (action === "health") {
      const { data: job } = await context.supabase.from("sync_jobs").insert({ provider_id: providerId, job_type: "health_check", status: "running", metadata: {} }).select("id").maybeSingle();
      const health = await provider.healthCheck();
      await context.supabase.from("integration_providers").update({ configuration_status: health.status === "healthy" ? "configured" : health.status === "not_configured" ? "missing_credentials" : "error", last_error: health.status === "healthy" ? null : health.message }).eq("id", providerId);
      if (job) await context.supabase.from("sync_jobs").update({ status: health.status === "healthy" ? "completed" : "failed", finished_at: new Date().toISOString(), errors_count: health.status === "healthy" ? 0 : 1, error_message: health.status === "healthy" ? null : health.message, metadata: { latencyMs: health.latencyMs ?? null } }).eq("id", job.id);
      await auditAdminAction(context, "integration.health", "integration_provider", providerId, { status: health.status });
      return NextResponse.json({ health });
    }
    if (action === "sync") {
      const body = bodySchema.parse(await request.json().catch(() => ({})));
      const defaultQueries = (process.env.MERCADO_LIVRE_SYNC_QUERIES ?? "processador,placa mãe,memória DDR5,placa de vídeo,SSD NVMe,fonte ATX,gabinete PC,cooler CPU").split(",").map((item) => item.trim()).filter(Boolean);
      const result = await new SyncService(new SupabaseSyncRepository(context.supabase)).syncProvider(provider, { queries: body.queries ?? defaultQueries, pages: body.pages, pageSize: body.pageSize });
      await auditAdminAction(context, "integration.sync", "integration_provider", providerId, { jobId: result.jobId, status: result.status });
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Ação desconhecida." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na integração." }, { status: 400 });
  }
}
