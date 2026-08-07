import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SyncService } from "@/integrations/core/sync-service";
import { parseCsvProducts } from "@/integrations/providers/csv/csv-parser";
import { SupabaseSyncRepository } from "@/integrations/repositories/supabase-sync-repository";
import { auditAdminAction, consumeAdminRateLimit, getAdminApiContext } from "@/lib/admin-api";

const bodySchema = z.object({ fileName: z.string().trim().min(1).max(180), content: z.string().min(1).max(5_000_000), mapping: z.record(z.string(), z.string()).optional(), allowPartial: z.boolean().default(false) });

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if (!context) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!consumeAdminRateLimit(`${context.user.id}:csv-import`, 5, 10 * 60_000)) return NextResponse.json({ error: "Limite temporário de importações atingido." }, { status: 429 });
  try {
    const body = bodySchema.parse(await request.json());
    const hash = createHash("sha256").update(body.content, "utf8").digest("hex");
    const { data: duplicate } = await context.supabase.from("csv_import_batches").select("id").eq("content_hash", hash).is("reverted_at", null).maybeSingle();
    if (duplicate) return NextResponse.json({ error: "Este arquivo já foi importado." }, { status: 409 });
    const parsed = parseCsvProducts(body.content, body.mapping);
    if (!parsed.products.length || (parsed.errors.length && !body.allowPartial)) return NextResponse.json({ error: "Corrija os erros antes de confirmar a importação.", errors: parsed.errors }, { status: 400 });
    const result = await new SyncService(new SupabaseSyncRepository(context.supabase)).importProducts(parsed.products, { fileName: body.fileName, contentHash: hash, invalidRows: parsed.errors.length });
    const { data: batch, error } = await context.supabase.from("csv_import_batches").insert({ sync_job_id: result.jobId, file_name: body.fileName, content_hash: hash, imported_by: context.user.id }).select("id,reversible_until").single();
    if (error) throw new Error("A importação terminou, mas o lote não pôde ser registrado para desfazer.");
    await auditAdminAction(context, "csv.import", "csv_import_batch", String(batch.id), { jobId: result.jobId, metrics: result.metrics, invalidRows: parsed.errors.length });
    return NextResponse.json({ ...result, batch, errors: parsed.errors });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao importar CSV." }, { status: 400 }); }
}
