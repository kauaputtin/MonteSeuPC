import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SyncRepository } from "@/integrations/core/sync-service";
import type { ExternalOffer, ExternalProduct, MatchCandidate, NormalizationResult, SyncMetrics } from "@/integrations/types/external";
import { specificationsSchema } from "@/lib/validations/schemas";
import { advanceOfferStaleness } from "@/integrations/core/staleness";
import { createPublishableSpecifications } from "@/integrations/core/publishable-specifications";
import { categorySlugs, type CategorySlug, type Component } from "@/types/domain";

function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 70) || "loja-importada";
}

function jsonValue(value: unknown) {
  if (value === undefined) return null;
  const serialized = JSON.stringify(value);
  if (serialized.length > 1_000_000) return { truncated: true };
  return JSON.parse(serialized) as unknown;
}

function dbError(error: { message: string; code?: string } | null, fallback: string): never | void {
  if (!error) return;
  if (error.code === "23505") throw new Error("Já existe uma sincronização igual em andamento ou o arquivo já foi importado.");
  throw new Error(`${fallback}: ${error.message}`);
}

export class SupabaseSyncRepository implements SyncRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async invalidateProviderCache(providerId: string) {
    const { error } = await this.supabase.from("integration_cache").delete().eq("provider_id", providerId);
    dbError(error, "Falha ao invalidar cache da fonte");
  }

  async beginJob(providerId: string, jobType: "catalog_sync" | "csv_import", metadata: Record<string, unknown>) {
    await this.supabase.from("sync_jobs").update({ status: "cancelled", finished_at: new Date().toISOString(), error_message: "Lock expirado após duas horas." }).eq("provider_id", providerId).eq("job_type", jobType).eq("status", "running").lt("started_at", new Date(Date.now() - 2 * 60 * 60_000).toISOString());
    const { data, error } = await this.supabase.from("sync_jobs").insert({ provider_id: providerId, job_type: jobType, metadata }).select("id").single();
    dbError(error, "Não foi possível iniciar o job");
    return String(data!.id);
  }

  async isProviderEnabled(providerId: string) {
    const { data, error } = await this.supabase.from("integration_providers").select("enabled").eq("id", providerId).maybeSingle();
    dbError(error, "Não foi possível consultar a fonte");
    return Boolean(data?.enabled);
  }

  async listComponents(): Promise<Component[]> {
    const [{ data: categories, error: categoryError }, { data: rows, error }] = await Promise.all([
      this.supabase.from("categories").select("id,slug"), this.supabase.from("components").select("*").eq("active", true).eq("is_demo", false)
    ]);
    dbError(categoryError, "Não foi possível ler categorias"); dbError(error, "Não foi possível ler componentes");
    const categoryMap = new Map((categories ?? []).map((item) => [String(item.id), String(item.slug)]));
    return (rows ?? []).flatMap((row): Component[] => {
      const category = categoryMap.get(String(row.category_id));
      const parsed = specificationsSchema.safeParse(row.specifications);
      if (!categorySlugs.includes(category as CategorySlug) || !parsed.success) return [];
      return [{ id: String(row.id), categorySlug: category as CategorySlug, brand: String(row.brand), name: String(row.name), slug: String(row.slug), description: String(row.description), imageUrl: String(row.image_url), specifications: parsed.data, estimatedWatts: Number(row.estimated_watts), active: true, gtin: row.gtin ?? undefined, ean: row.ean ?? undefined, mpn: row.mpn ?? undefined, model: row.model_normalized ?? undefined, specificationStatus: row.specification_status ?? "verified" }];
    });
  }

  async createPublishableComponent(product: ExternalProduct, normalized: NormalizationResult) {
    if (!normalized.categorySlug || !product.offers.some((offer) => offer.available)) return null;
    const complete = specificationsSchema.safeParse(normalized.specifications);
    const specifications = complete.success ? complete.data : createPublishableSpecifications(normalized, product.title);
    if (!specifications) return null;
    const { data: category, error: categoryError } = await this.supabase.from("categories").select("id").eq("slug", normalized.categorySlug).single();
    dbError(categoryError, "Categoria normalizada não encontrada");
    const componentSlug = slug(`${normalized.brand ?? product.brand ?? "componente"}-${normalized.model ?? product.model ?? product.title}-${product.providerId}-${product.externalId}`);
    const estimatedWatts = specifications.kind === "processor" ? specifications.tdpWatts : specifications.kind === "gpu" ? specifications.powerWatts : 0;
    const payload = { category_id: category!.id, brand: (normalized.brand ?? product.brand ?? "Fabricante não informado").slice(0, 80), name: product.title.slice(0, 120), slug: componentSlug, description: (product.description ?? "Produto real importado da API oficial do Mercado Livre. Confirme a ficha técnica no anúncio antes da compra.").slice(0, 1200), image_url: product.imageUrl ?? `/products/${normalized.categorySlug}.svg`, specifications, estimated_watts: estimatedWatts, active: true, gtin: product.gtin ?? null, ean: product.ean ?? null, mpn: product.mpn ?? null, model_normalized: normalized.model, specification_status: complete.success && normalized.status === "verified" ? "verified" : normalized.status === "unverified" ? "unverified" : "partial", specification_sources: [product.productUrl] };
    const { data, error } = await this.supabase.from("components").upsert(payload, { onConflict: "slug" }).select("id").single();
    dbError(error, "Falha ao criar componente verificado");
    return String(data!.id);
  }

  async saveExternalProduct(product: ExternalProduct, normalized: NormalizationResult, componentId: string | null, confidence: number | null, jobId: string) {
    const { data: existing, error: lookupError } = await this.supabase.from("external_products").select("id,component_id,match_status").eq("provider_id", product.providerId).eq("external_id", product.externalId).maybeSingle();
    dbError(lookupError, "Falha ao identificar produto externo");
    const preservedComponentId = !componentId && existing?.component_id && existing.match_status === "approved" ? String(existing.component_id) : componentId;
    const matchStatus = existing?.match_status === "approved" && preservedComponentId ? "approved" : preservedComponentId ? "auto_matched" : confidence !== null && confidence >= 0.75 ? "pending" : "separated";
    const payload = {
      provider_id: product.providerId, external_id: product.externalId, external_sku: product.externalSku ?? null,
      gtin: product.gtin ?? null, ean: product.ean ?? null, mpn: product.mpn ?? null, brand: product.brand ?? null,
      title: product.title, model: product.model ?? null, category: product.category ?? null, product_url: product.productUrl,
      image_url: product.imageUrl ?? null, specifications: product.specifications, normalized_specifications: normalized.specifications,
      verification_status: normalized.status, raw_payload: jsonValue(product.rawPayload), component_id: preservedComponentId,
      match_status: matchStatus, match_confidence: confidence, sync_job_id: jobId, fetched_at: product.fetchedAt
    };
    const { data, error } = await this.supabase.from("external_products").upsert(payload, { onConflict: "provider_id,external_id" }).select("id").single();
    dbError(error, "Falha ao persistir produto externo");
    return { id: String(data!.id), created: !existing, componentId: preservedComponentId };
  }

  async saveMatchCandidates(externalProductId: string, candidates: MatchCandidate[]) {
    if (!candidates.length) return;
    const { error } = await this.supabase.from("product_match_candidates").upsert(candidates.map((candidate) => ({ external_product_id: externalProductId, component_id: candidate.componentId, confidence: candidate.confidence, match_reasons: candidate.reasons, status: "pending" })), { onConflict: "external_product_id,component_id", ignoreDuplicates: false });
    dbError(error, "Falha ao persistir candidatos");
  }

  private async ensureStore(providerId: string, offer: ExternalOffer) {
    if (providerId === "mercado-livre") return "store-mercado-livre";
    const name = (offer.sellerName?.trim() || "Loja importada").slice(0, 100);
    const id = `store-csv-${slug(name)}`;
    const origin = new URL(offer.productUrl).origin;
    const { error } = await this.supabase.from("stores").upsert({ id, name, slug: `csv-${slug(name)}`, website_url: origin, active: true }, { onConflict: "id" });
    dbError(error, "Falha ao persistir loja");
    return id;
  }

  async saveOffers(externalProductId: string, componentId: string | null, offers: ExternalOffer[], jobId: string) {
    const seen = new Set<string>();
    for (const offer of offers) {
      seen.add(offer.externalId);
      const storeId = await this.ensureStore(offer.providerId, offer);
      const { data: source, error: sourceLookupError } = await this.supabase.from("offer_sources").select("id,offer_id").eq("provider_id", offer.providerId).eq("external_product_id", externalProductId).eq("external_offer_id", offer.externalId).maybeSingle();
      dbError(sourceLookupError, "Falha ao identificar origem da oferta");
      let offerId = source?.offer_id ? String(source.offer_id) : null;
      if (componentId) {
        const offerPayload = {
          component_id: componentId, store_id: storeId, price: offer.price, pix_price: offer.pixPrice ?? null,
          original_price: offer.originalPrice ?? null, installment_price: offer.installmentPrice ?? null,
          installments: offer.installments ?? null, shipping_price: offer.shippingPrice ?? null, product_url: offer.productUrl,
          original_url: offer.productUrl, affiliate_url: offer.affiliateUrl ?? null, affiliate_program: offer.affiliateProgram ?? null,
          affiliate_created_at: offer.affiliateUrl ? offer.fetchedAt : null,
          affiliate: Boolean(offer.affiliateUrl), affiliate_status: offer.affiliateUrl ? "active" : null,
          seller_external_id: offer.sellerExternalId ?? null, seller_name: offer.sellerName ?? null, condition: offer.condition,
          stock_quantity: offer.stockQuantity ?? null, source_provider_id: offer.providerId, available: offer.available,
          stale_at: null, last_seen_at: offer.fetchedAt, last_checked_at: offer.fetchedAt, consecutive_failures: 0
        };
        if (offerId) {
          const { error } = await this.supabase.from("offers").update(offerPayload).eq("id", offerId); dbError(error, "Falha ao atualizar oferta");
        } else {
          const { data, error } = await this.supabase.from("offers").insert(offerPayload).select("id").single(); dbError(error, "Falha ao criar oferta"); offerId = String(data!.id);
        }
      }
      const sourcePayload = {
        provider_id: offer.providerId, external_product_id: externalProductId, external_offer_id: offer.externalId, offer_id: offerId,
        store_id: storeId, seller_external_id: offer.sellerExternalId ?? null, seller_name: offer.sellerName ?? null,
        price: offer.price, pix_price: offer.pixPrice ?? null, original_price: offer.originalPrice ?? null,
        installment_price: offer.installmentPrice ?? null, installments: offer.installments ?? null,
        shipping_price: offer.shippingPrice ?? null, currency: offer.currency, available: offer.available,
        stock_quantity: offer.stockQuantity ?? null, condition: offer.condition, fetched_at: offer.fetchedAt,
        original_url: offer.productUrl, affiliate_url: offer.affiliateUrl ?? null, affiliate_program: offer.affiliateProgram ?? null,
        affiliate_created_at: offer.affiliateUrl ? offer.fetchedAt : null, affiliate_status: offer.affiliateUrl ? "active" : null, active: offer.available, last_seen_at: offer.fetchedAt, sync_job_id: jobId
      };
      const { error } = await this.supabase.from("offer_sources").upsert(sourcePayload, { onConflict: "provider_id,external_product_id,external_offer_id" });
      dbError(error, "Falha ao persistir origem da oferta");
    }
    const { data: missed, error } = await this.supabase.from("offer_sources").select("offer_id,external_offer_id").eq("external_product_id", externalProductId).not("offer_id", "is", null);
    dbError(error, "Falha ao verificar ofertas ausentes");
    for (const item of missed ?? []) {
      if (seen.has(String(item.external_offer_id))) continue;
      const { data: current } = await this.supabase.from("offers").select("consecutive_failures").eq("id", item.offer_id).single();
      const freshness = advanceOfferStaleness(Number(current?.consecutive_failures ?? 0));
      const { error: updateError } = await this.supabase.from("offers").update({ consecutive_failures: freshness.consecutiveFailures, stale_at: freshness.staleAt }).eq("id", item.offer_id);
      dbError(updateError, "Falha ao marcar oferta desatualizada");
    }
  }

  async finishJob(jobId: string, providerId: string, metrics: SyncMetrics, status: "completed" | "partial" | "failed", errorMessage?: string) {
    const now = new Date();
    const { error } = await this.supabase.from("sync_jobs").update({ status, finished_at: now.toISOString(), items_found: metrics.itemsFound, items_created: metrics.itemsCreated, items_updated: metrics.itemsUpdated, items_ignored: metrics.itemsIgnored, errors_count: metrics.errorsCount, error_message: errorMessage ?? null }).eq("id", jobId);
    dbError(error, "Falha ao finalizar job");
    const { data: provider } = await this.supabase.from("integration_providers").select("sync_interval_minutes").eq("id", providerId).single();
    const providerUpdate = status === "failed"
      ? { last_failure_at: now.toISOString(), last_error: errorMessage ?? "Falha na sincronização" }
      : { last_success_at: now.toISOString(), last_error: status === "partial" ? errorMessage ?? "Sincronização parcial" : null, configuration_status: "configured", next_sync_at: new Date(now.getTime() + Number(provider?.sync_interval_minutes ?? 1440) * 60_000).toISOString() };
    const { error: providerError } = await this.supabase.from("integration_providers").update(providerUpdate).eq("id", providerId);
    dbError(providerError, "Falha ao atualizar estado da fonte");
  }
}
