import type { ProductProvider } from "@/integrations/core/provider";
import { externalProductsSchema } from "@/integrations/schemas/external";
import type { GetOffersInput, GetProductInput, ProviderCapabilities, ProviderHealth, SearchProductsInput } from "@/integrations/types/external";
import fixture from "@/tests/fixtures/external-products.json";

export class MockProductProvider implements ProductProvider {
  readonly id = "mock"; readonly name = "Fixtures de desenvolvimento";
  readonly capabilities: ProviderCapabilities = { productSearch: true, productDetails: true, offers: true, stock: true, technicalSpecifications: true, images: true, affiliateLinks: false };
  private readonly products = externalProductsSchema.parse(fixture);
  async isConfigured() { return process.env.NODE_ENV !== "production" && process.env.INTEGRATION_MOCK_ENABLED === "true"; }
  async searchProducts(input: SearchProductsInput) { const query = input.query.toLowerCase(); return this.products.filter((product) => product.title.toLowerCase().includes(query)).slice(input.offset ?? 0, (input.offset ?? 0) + (input.limit ?? 20)); }
  async getProduct(input: GetProductInput) { return this.products.find((product) => product.externalId === input.externalId) ?? null; }
  async getOffers(input: GetOffersInput) { return this.products.find((product) => product.externalId === input.externalProductId)?.offers ?? []; }
  async healthCheck(): Promise<ProviderHealth> { return { status: await this.isConfigured() ? "healthy" : "not_configured", checkedAt: new Date().toISOString(), message: "Provider exclusivo para testes locais; nunca representa preços reais." }; }
}
