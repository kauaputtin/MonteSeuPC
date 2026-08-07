import type { ProductProvider } from "@/integrations/core/provider";
import { normalizeExternalProduct } from "@/integrations/core/normalizer";
import { canAutoMatch, rankProductMatches } from "@/integrations/core/product-matcher";
import { externalProductSchema } from "@/integrations/schemas/external";
import type { ExternalProduct, MatchCandidate, NormalizationResult, SyncMetrics } from "@/integrations/types/external";
import type { Component } from "@/types/domain";

export interface SavedExternalProduct { id: string; created: boolean; componentId: string | null; }
export interface SyncRepository {
  beginJob(providerId: string, jobType: "catalog_sync" | "csv_import", metadata: Record<string, unknown>): Promise<string>;
  isProviderEnabled(providerId: string): Promise<boolean>;
  listComponents(): Promise<Component[]>;
  createPublishableComponent?(product: ExternalProduct, normalized: NormalizationResult): Promise<string | null>;
  saveExternalProduct(product: ExternalProduct, normalized: NormalizationResult, componentId: string | null, confidence: number | null, jobId: string): Promise<SavedExternalProduct>;
  saveMatchCandidates(externalProductId: string, candidates: MatchCandidate[]): Promise<void>;
  saveOffers(externalProductId: string, componentId: string | null, offers: ExternalProduct["offers"], jobId: string): Promise<void>;
  invalidateProviderCache?(providerId: string): Promise<void>;
  finishJob(jobId: string, providerId: string, metrics: SyncMetrics, status: "completed" | "partial" | "failed", errorMessage?: string): Promise<void>;
}

export interface ProviderSyncInput {
  queries: string[];
  pages?: number;
  pageSize?: number;
}

function errorMessage(error: unknown) {
  return (error instanceof Error ? error.message : "Falha desconhecida").replace(/Bearer\s+\S+/gi, "Bearer [oculto]").slice(0, 1_000);
}

export class SyncService {
  constructor(private readonly repository: SyncRepository) {}

  private async processProducts(providerId: string, products: ExternalProduct[], jobId: string, metrics: SyncMetrics, seen = new Set<string>()) {
    const components = await this.repository.listComponents();
    for (const rawProduct of products) {
      try {
        const product = externalProductSchema.parse(rawProduct);
        const identity = `${product.providerId}:${product.externalId}`;
        if (seen.has(identity)) { metrics.itemsIgnored++; continue; }
        seen.add(identity); metrics.itemsFound++;
        if (product.providerId !== providerId) throw new Error("O produto não pertence ao provider desta sincronização.");
        const normalized = normalizeExternalProduct(product);
        const candidates = rankProductMatches(product, normalized, components).slice(0, 10);
        const best = candidates[0];
        let componentId = canAutoMatch(best) ? best.componentId : null;
        let confidence = best?.confidence ?? null;
        if (!componentId && (!best || best.confidence < 0.75) && normalized.categorySlug && product.offers.some((offer) => offer.available)) {
          componentId = await this.repository.createPublishableComponent?.(product, normalized) ?? null;
          if (componentId) { confidence = 1; components.splice(0, components.length, ...await this.repository.listComponents()); }
        }
        const saved = await this.repository.saveExternalProduct(product, normalized, componentId, confidence, jobId);
        await this.repository.saveMatchCandidates(saved.id, candidates);
        await this.repository.saveOffers(saved.id, saved.componentId, product.offers, jobId);
        if (saved.created) metrics.itemsCreated++; else metrics.itemsUpdated++;
      } catch (error) {
        metrics.errorsCount++;
        console.error(JSON.stringify({ event: "integration.product.failed", providerId, jobId, error: errorMessage(error) }));
      }
    }
  }

  async syncProvider(provider: ProductProvider, input: ProviderSyncInput) {
    if (!await this.repository.isProviderEnabled(provider.id)) throw new Error(`A fonte ${provider.name} está desativada.`);
    if (!await provider.isConfigured()) throw new Error(`A fonte ${provider.name} não possui credenciais válidas.`);
    if (!provider.capabilities.productSearch || !provider.searchProducts) throw new Error(`A fonte ${provider.name} não oferece busca de produtos.`);
    const queries = [...new Set(input.queries.map((query) => query.trim()).filter(Boolean))].slice(0, 25);
    if (!queries.length) throw new Error("Informe ao menos um termo de busca.");
    const pages = Math.max(1, Math.min(input.pages ?? 1, 10));
    const pageSize = Math.max(1, Math.min(input.pageSize ?? 10, 20));
    const jobId = await this.repository.beginJob(provider.id, "catalog_sync", { queries, pages, pageSize });
    console.info(JSON.stringify({ event: "integration.sync.started", providerId: provider.id, jobId, queriesCount: queries.length, pages, pageSize }));
    const metrics: SyncMetrics = { itemsFound: 0, itemsCreated: 0, itemsUpdated: 0, itemsIgnored: 0, errorsCount: 0 };
    const seen = new Set<string>();
    const failures: string[] = [];
    try {
      for (const query of queries) {
        for (let page = 0; page < pages; page++) {
          try {
            const products = await provider.searchProducts({ query, limit: pageSize, offset: page * pageSize });
            await this.processProducts(provider.id, products, jobId, metrics, seen);
            if (products.length < pageSize) break;
          } catch (error) {
            metrics.errorsCount++;
            failures.push(`${query}: ${errorMessage(error)}`);
            console.error(JSON.stringify({ event: "integration.batch.failed", providerId: provider.id, jobId, query, page, error: errorMessage(error) }));
          }
        }
      }
      const status = metrics.errorsCount ? (metrics.itemsFound ? "partial" : "failed") : "completed";
      if (status !== "failed") await this.repository.invalidateProviderCache?.(provider.id);
      const failureSummary = failures.length ? failures.slice(0, 3).join(" | ") : "Uma ou mais etapas da sincronização falharam.";
      await this.repository.finishJob(jobId, provider.id, metrics, status, status === "completed" ? undefined : failureSummary);
      console.info(JSON.stringify({ event: "integration.sync.finished", providerId: provider.id, jobId, status, metrics }));
      return { jobId, status, metrics };
    } catch (error) {
      metrics.errorsCount++;
      await this.repository.finishJob(jobId, provider.id, metrics, "failed", errorMessage(error));
      throw error;
    }
  }

  async importProducts(products: ExternalProduct[], metadata: Record<string, unknown> = {}) {
    const providerId = "csv";
    if (!await this.repository.isProviderEnabled(providerId)) throw new Error("A importação CSV está desativada.");
    const jobId = await this.repository.beginJob(providerId, "csv_import", metadata);
    console.info(JSON.stringify({ event: "integration.csv.started", providerId, jobId, items: products.length }));
    const metrics: SyncMetrics = { itemsFound: 0, itemsCreated: 0, itemsUpdated: 0, itemsIgnored: 0, errorsCount: 0 };
    try {
      await this.processProducts(providerId, products, jobId, metrics);
      const status = metrics.errorsCount ? (metrics.itemsFound ? "partial" : "failed") : "completed";
      if (status !== "failed") await this.repository.invalidateProviderCache?.(providerId);
      await this.repository.finishJob(jobId, providerId, metrics, status);
      console.info(JSON.stringify({ event: "integration.csv.finished", providerId, jobId, status, metrics }));
      return { jobId, status, metrics };
    } catch (error) {
      metrics.errorsCount++;
      await this.repository.finishJob(jobId, providerId, metrics, "failed", errorMessage(error));
      throw error;
    }
  }
}
