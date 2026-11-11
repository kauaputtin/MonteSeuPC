import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeExternalProduct } from "@/integrations/core/normalizer";
import { rankProductMatches } from "@/integrations/core/product-matcher";
import { externalProductSchema } from "@/integrations/schemas/external";
import { SupabaseSyncRepository } from "@/integrations/repositories/supabase-sync-repository";
import { auditAdminAction, getAdminApiContext, safeErrorMessage } from "@/lib/admin-api";
import { invalidateCatalog } from "@/lib/catalog";

export async function GET() {
  const context = await getAdminApiContext();
  if (!context) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { data, error } = await context.supabase.from("external_products").select("*,product_match_candidates(*),offer_sources(*)").in("match_status", ["pending", "separated"]).order("match_confidence", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Não foi possível carregar a fila." }, { status: 500 });
  const componentIds = [...new Set((data ?? []).flatMap((product) => (product.product_match_candidates as { component_id: string }[] ?? []).map((candidate) => candidate.component_id)))];
  const { data: components } = componentIds.length ? await context.supabase.from("components").select("id,brand,name,slug,specifications").in("id", componentIds) : { data: [] };
  return NextResponse.json({ items: data ?? [], components: components ?? [] });
}

const actionSchema = z.object({ action: z.enum(["approve", "reject", "separate", "undo", "renormalize"]), candidateId: z.string().optional(), externalProductId: z.string().optional() });

export async function PATCH(request: Request) {
  const context = await getAdminApiContext();
  if (!context) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  const { action } = parsed.data;
  try {
    if (action === "undo" || action === "renormalize") {
      if (!parsed.data.externalProductId) throw new Error("Produto externo obrigatório.");
      const { data: product } = await context.supabase.from("external_products").select("*").eq("id", parsed.data.externalProductId).single();
      if (!product) throw new Error("Produto externo não encontrado.");
      if (action === "undo") {
        const { data: sources } = await context.supabase.from("offer_sources").select("offer_id").eq("external_product_id", product.id).not("offer_id", "is", null);
        const offerIds = (sources ?? []).map((source) => source.offer_id).filter(Boolean);
        if (offerIds.length) await context.supabase.from("offers").update({ stale_at: new Date().toISOString() }).in("id", offerIds);
        await context.supabase.from("external_products").update({ component_id: null, match_status: "pending" }).eq("id", product.id);
      } else {
        const external = externalProductSchema.parse({ providerId: product.provider_id, externalId: product.external_id, externalSku: product.external_sku ?? undefined, gtin: product.gtin ?? undefined, ean: product.ean ?? undefined, mpn: product.mpn ?? undefined, brand: product.brand ?? undefined, title: product.title, model: product.model ?? undefined, category: product.category ?? undefined, imageUrl: product.image_url ?? undefined, productUrl: product.product_url, specifications: product.specifications, offers: [], fetchedAt: product.fetched_at });
        const normalized = normalizeExternalProduct(external);
        const repository = new SupabaseSyncRepository(context.supabase);
        const candidates = rankProductMatches(external, normalized, await repository.listComponents()).slice(0, 10);
        await repository.saveMatchCandidates(String(product.id), candidates);
        await context.supabase.from("external_products").update({ normalized_specifications: normalized.specifications, verification_status: normalized.status, match_confidence: candidates[0]?.confidence ?? null, match_status: "pending" }).eq("id", product.id);
      }
      await auditAdminAction(context, `match.${action}`, "external_product", String(product.id));
      invalidateCatalog();
      return NextResponse.json({ ok: true });
    }
    if (!parsed.data.candidateId) throw new Error("Candidato obrigatório.");
    const { data: candidate } = await context.supabase.from("product_match_candidates").select("*").eq("id", parsed.data.candidateId).single();
    if (!candidate) throw new Error("Candidato não encontrado.");
    if (action === "reject" || action === "separate") {
      await context.supabase.from("product_match_candidates").update({ status: action === "reject" ? "rejected" : "separated", reviewed_by: context.user.id, reviewed_at: new Date().toISOString() }).eq("id", candidate.id);
      if (action === "separate") await context.supabase.from("external_products").update({ component_id: null, match_status: "separated" }).eq("id", candidate.external_product_id);
    } else {
      await context.supabase.from("external_products").update({ component_id: candidate.component_id, match_status: "approved", match_confidence: candidate.confidence }).eq("id", candidate.external_product_id);
      await context.supabase.from("product_match_candidates").update({ status: "rejected", reviewed_by: context.user.id, reviewed_at: new Date().toISOString() }).eq("external_product_id", candidate.external_product_id).neq("id", candidate.id);
      await context.supabase.from("product_match_candidates").update({ status: "approved", reviewed_by: context.user.id, reviewed_at: new Date().toISOString() }).eq("id", candidate.id);
      const { data: sources } = await context.supabase.from("offer_sources").select("*").eq("external_product_id", candidate.external_product_id);
      for (const source of sources ?? []) {
        const payload = { component_id: candidate.component_id, store_id: source.store_id, price: source.price, pix_price: source.pix_price, original_price: source.original_price, installment_price: source.installment_price, installments: source.installments, shipping_price: source.shipping_price, product_url: source.original_url, original_url: source.original_url, affiliate_url: source.affiliate_url, affiliate_program: source.affiliate_program, affiliate: Boolean(source.affiliate_url), affiliate_status: source.affiliate_status, seller_external_id: source.seller_external_id, seller_name: source.seller_name, condition: source.condition, stock_quantity: source.stock_quantity, source_provider_id: source.provider_id, available: source.available, stale_at: null, last_seen_at: source.fetched_at, last_checked_at: source.fetched_at, consecutive_failures: 0 };
        let offerId = source.offer_id;
        if (offerId) await context.supabase.from("offers").update(payload).eq("id", offerId);
        else { const { data: offer } = await context.supabase.from("offers").insert(payload).select("id").single(); offerId = offer?.id; }
        if (offerId) await context.supabase.from("offer_sources").update({ offer_id: offerId }).eq("id", source.id);
      }
    }
    invalidateCatalog();
    await auditAdminAction(context, `match.${action}`, "product_match_candidate", String(candidate.id), { externalProductId: candidate.external_product_id, componentId: candidate.component_id });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: safeErrorMessage(error, "Falha ao revisar associação.") }, { status: 400 }); }
}
