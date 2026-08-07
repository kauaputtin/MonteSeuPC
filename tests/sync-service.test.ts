import { describe, expect, it } from "vitest";
import fixture from "@/tests/fixtures/external-products.json";
import type { ProductProvider } from "@/integrations/core/provider";
import { SyncService, type SyncRepository } from "@/integrations/core/sync-service";
import { externalProductsSchema } from "@/integrations/schemas/external";
import type { ExternalProduct, NormalizationResult, SyncMetrics } from "@/integrations/types/external";
import { components } from "@/data/mock-data";
import type { Component } from "@/types/domain";

class MemoryRepository implements SyncRepository {
  products = new Map<string, string>(); offers = new Map<string, number>(); finishes: { status: string; metrics: SyncMetrics }[] = [];
  enabled = true; private jobs = 0;
  async beginJob() { return `job-${++this.jobs}`; }
  async isProviderEnabled() { return this.enabled; }
  async listComponents(): Promise<Component[]> { return [{ ...components[0], id: "amd-5600g", brand: "AMD", name: "Ryzen 5 5600G", model: "Ryzen 5 5600G", gtin: "730143313414", ean: "730143313414", mpn: "100-100000252BOX", specifications: { kind: "processor", socket: "AM4", cores: 6, threads: 12, baseClockGhz: 3.9, turboClockGhz: 4.4, tdpWatts: 65, integratedGraphics: true, coolerIncluded: true } }]; }
  async saveExternalProduct(product: ExternalProduct, _normalized: NormalizationResult, componentId: string | null) { const key = `${product.providerId}:${product.externalId}`; const created = !this.products.has(key); const id = this.products.get(key) ?? `external-${this.products.size + 1}`; this.products.set(key, id); return { id, created, componentId }; }
  async saveMatchCandidates() {}
  async saveOffers(_externalId: string, _componentId: string | null, offers: ExternalProduct["offers"]) { for (const offer of offers) this.offers.set(offer.externalId, offer.price); }
  async finishJob(_jobId: string, _providerId: string, metrics: SyncMetrics, status: "completed" | "partial" | "failed") { this.finishes.push({ status, metrics: { ...metrics } }); }
}

function provider(products: ExternalProduct[]): ProductProvider {
  return { id: "mock", name: "Teste", capabilities: { productSearch: true, productDetails: true, offers: true, stock: true, technicalSpecifications: true, images: true, affiliateLinks: false }, isConfigured: async () => true, searchProducts: async () => products, getProduct: async () => null, getOffers: async () => [], healthCheck: async () => ({ status: "healthy", checkedAt: new Date().toISOString(), message: "ok" }) };
}

describe("SyncService", () => {
  const valid = externalProductsSchema.parse(fixture);

  it("cria e depois atualiza de forma idempotente, sem duplicar oferta", async () => {
    const repository = new MemoryRepository(); const service = new SyncService(repository);
    const first = await service.syncProvider(provider(valid), { queries: ["5600G"], pageSize: 10 });
    const second = await service.syncProvider(provider(valid), { queries: ["5600G"], pageSize: 10 });
    expect(first.metrics.itemsCreated).toBe(1); expect(second.metrics.itemsUpdated).toBe(1);
    expect(repository.products.size).toBe(1); expect(repository.offers.size).toBe(1);
  });

  it("finaliza como parcial quando um item falha e preserva os demais", async () => {
    const repository = new MemoryRepository(); const invalid = { ...valid[0], providerId: "outro" } as ExternalProduct;
    const result = await new SyncService(repository).syncProvider(provider([...valid, invalid]), { queries: ["5600G"], pageSize: 10 });
    expect(result.status).toBe("partial"); expect(result.metrics.itemsFound).toBe(2); expect(result.metrics.errorsCount).toBe(1); expect(repository.products.size).toBe(1);
  });

  it("recusa fonte desativada antes de criar o job", async () => {
    const repository = new MemoryRepository(); repository.enabled = false;
    await expect(new SyncService(repository).syncProvider(provider(valid), { queries: ["5600G"] })).rejects.toThrow("desativada");
  });
});
