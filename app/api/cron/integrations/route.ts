import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { SyncService } from "@/integrations/core/sync-service";
import { SupabaseSyncRepository } from "@/integrations/repositories/supabase-sync-repository";
import { getProviderRegistry } from "@/integrations/registry";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET ?? ""; const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(expected); const b = Buffer.from(supplied); return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const supabase = createAdminSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase service role não configurada." }, { status: 503 });
  const { data, error } = await supabase.from("integration_providers").select("id").eq("enabled", true).in("integration_type", ["official_api", "affiliate_api", "authorized_feed"]).or(`next_sync_at.is.null,next_sync_at.lte.${new Date().toISOString()}`).limit(2);
  if (error) return NextResponse.json({ error: "Falha ao consultar a agenda." }, { status: 500 });
  const queries = (process.env.MERCADO_LIVRE_SYNC_QUERIES ?? "processador,placa mãe,memória DDR5,placa de vídeo,SSD NVMe,fonte ATX,gabinete PC,cooler CPU").split(",").map((item) => item.trim()).filter(Boolean);
  const results = [];
  for (const row of data ?? []) {
    const provider = getProviderRegistry().get(String(row.id));
    if (!provider || !provider.capabilities.productSearch) continue;
    try { results.push(await new SyncService(new SupabaseSyncRepository(supabase)).syncProvider(provider, { queries, pages: 1, pageSize: 10 })); }
    catch (caught) { results.push({ providerId: row.id, status: "failed", error: caught instanceof Error ? caught.message : "Falha" }); }
  }
  return NextResponse.json({ processed: results.length, results });
}
