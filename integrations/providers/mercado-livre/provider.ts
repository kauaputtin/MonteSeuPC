import { CircuitBreaker } from "@/integrations/core/circuit-breaker";
import type { ProductProvider } from "@/integrations/core/provider";
import { TokenBucketRateLimiter } from "@/integrations/core/rate-limiter";
import { safeFetchJson } from "@/integrations/core/safe-fetch";
import { externalOfferSchema, externalProductSchema } from "@/integrations/schemas/external";
import type { ExternalOffer, ExternalProduct, GetOffersInput, GetProductInput, ProviderCapabilities, ProviderHealth, SearchProductsInput } from "@/integrations/types/external";
import { catalogOffersSchema, catalogProductSchema, catalogSearchSchema, itemMultigetSchema, type MercadoLivreCatalogProduct, type MercadoLivreItem } from "./schemas";

const API_HOST = "api.mercadolibre.com";
const API_ROOT = `https://${API_HOST}`;

function attributeMap(attributes: MercadoLivreCatalogProduct["attributes"] | MercadoLivreItem["attributes"]) {
  const entries = attributes.flatMap((attribute) => {
    const value = attribute.value_struct?.number !== undefined
      ? `${attribute.value_struct.number}${attribute.value_struct.unit ? ` ${attribute.value_struct.unit}` : ""}`
      : attribute.value_name;
    if (value === null || value === undefined) return [];
    return [[attribute.id.toLowerCase(), value], ...(attribute.name ? [[attribute.name, value]] : [])] as [string, unknown][];
  });
  return Object.fromEntries(entries);
}

function attribute(attributes: MercadoLivreCatalogProduct["attributes"] | MercadoLivreItem["attributes"], ...ids: string[]) {
  const wanted = ids.map((id) => id.toUpperCase());
  return attributes.find((item) => wanted.includes(item.id.toUpperCase()))?.value_name ?? undefined;
}

function normalizeCondition(value?: string): ExternalOffer["condition"] {
  if (value === "new") return "new";
  if (value === "used") return "used";
  if (value === "refurbished") return "refurbished";
  return "unknown";
}

function numericIdentifier(value?: string) {
  const normalized = value?.replace(/\D/g, "") ?? "";
  return normalized.length >= 8 && normalized.length <= 14 ? normalized : undefined;
}

export class MercadoLivreProvider implements ProductProvider {
  readonly id = "mercado-livre";
  readonly name = "Mercado Livre";
  readonly capabilities: ProviderCapabilities = {
    productSearch: true, productDetails: true, offers: true, stock: true,
    technicalSpecifications: true, images: true, affiliateLinks: false
  };
  private readonly limiter = new TokenBucketRateLimiter({ capacity: 4, refillPerSecond: 2 });
  private readonly breaker = new CircuitBreaker(4, 60_000);

  constructor(private readonly getAccessToken: () => Promise<string | null> = async () => process.env.MERCADO_LIVRE_ACCESS_TOKEN?.trim() || null) {}

  async isConfigured() { return Boolean(await this.getAccessToken()); }

  private async request(path: string) {
    const token = await this.getAccessToken();
    if (!token) throw new Error("Mercado Livre não configurado: conclua o OAuth ou defina MERCADO_LIVRE_ACCESS_TOKEN no servidor.");
    await this.limiter.acquire();
    return this.breaker.execute(() => safeFetchJson(`${API_ROOT}${path}`, {
      allowedHosts: [API_HOST], timeoutMs: 8_000, maxResponseBytes: 3_000_000,
      headers: { Authorization: `Bearer ${token}` }
    }));
  }

  async searchProducts(input: SearchProductsInput): Promise<ExternalProduct[]> {
    const limit = Math.max(1, Math.min(input.limit ?? 10, 20));
    const offset = Math.max(0, input.offset ?? 0);
    const raw = await this.request(`/products/search?status=active&site_id=MLB&q=${encodeURIComponent(input.query)}&limit=${limit}&offset=${offset}`);
    const search = catalogSearchSchema.parse(raw);
    const products: ExternalProduct[] = [];
    for (const candidate of search.results) {
      const offers = await this.getOffers({ externalProductId: candidate.id, limit: 50 });
      products.push(this.toProduct(candidate, offers));
    }
    return products;
  }

  async getProduct(input: GetProductInput): Promise<ExternalProduct | null> {
    try {
      const raw = await this.request(`/products/${encodeURIComponent(input.externalId)}`);
      const product = catalogProductSchema.parse(raw);
      const offers = await this.getOffers({ externalProductId: product.id, limit: 100 });
      return this.toProduct(product, offers);
    } catch (error) {
      if (error instanceof Error && /HTTP 404/.test(error.message)) return null;
      throw error;
    }
  }

  async getOffers(input: GetOffersInput): Promise<ExternalOffer[]> {
    const limit = Math.max(1, Math.min(input.limit ?? 100, 100));
    const raw = await this.request(`/products/${encodeURIComponent(input.externalProductId)}/items?limit=${limit}`);
    const listing = catalogOffersSchema.parse(raw);
    const itemIds = listing.results.map((item) => item.item_id).slice(0, limit);
    const offers: ExternalOffer[] = [];
    for (let index = 0; index < itemIds.length; index += 20) {
      const ids = itemIds.slice(index, index + 20);
      const fields = "id,title,price,original_price,currency_id,available_quantity,status,condition,seller_id,permalink,thumbnail,catalog_product_id,category_id,domain_id,attributes,last_updated";
      const detailsRaw = await this.request(`/items?ids=${ids.map(encodeURIComponent).join(",")}&attributes=${fields}`);
      const details = itemMultigetSchema.parse(detailsRaw);
      for (const response of details) {
        if (response.code !== 200 || !response.body || response.body.currency_id !== "BRL") continue;
        const item = response.body;
        const offer = externalOfferSchema.parse({
          providerId: this.id, externalId: item.id, sellerExternalId: item.seller_id ? String(item.seller_id) : undefined,
          price: item.price, originalPrice: item.original_price ?? undefined, currency: "BRL", available: item.status === "active" && (item.available_quantity ?? 1) > 0,
          condition: normalizeCondition(item.condition), productUrl: item.permalink, fetchedAt: item.last_updated && !Number.isNaN(Date.parse(item.last_updated)) ? new Date(item.last_updated).toISOString() : new Date().toISOString()
        });
        offers.push(offer);
      }
    }
    return offers;
  }

  private toProduct(product: MercadoLivreCatalogProduct, offers: ExternalOffer[]): ExternalProduct {
    const firstOffer = offers[0];
    const attributes = product.attributes;
    const image = product.pictures[0]?.secure_url ?? product.pictures[0]?.url;
    return externalProductSchema.parse({
      providerId: this.id,
      externalId: product.id,
      gtin: numericIdentifier(attribute(attributes, "GTIN", "EAN")),
      ean: numericIdentifier(attribute(attributes, "EAN", "GTIN")),
      mpn: attribute(attributes, "PART_NUMBER", "MPN") || undefined,
      brand: attribute(attributes, "BRAND") || undefined,
      title: product.name,
      model: attribute(attributes, "MODEL") || undefined,
      category: product.domain_id,
      description: product.short_description?.content,
      imageUrl: image,
      productUrl: firstOffer?.productUrl ?? `${API_ROOT}/products/${encodeURIComponent(product.id)}`,
      specifications: attributeMap(attributes),
      offers,
      rawPayload: product,
      fetchedAt: new Date().toISOString()
    });
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!await this.isConfigured()) return { status: "not_configured", checkedAt: new Date().toISOString(), message: "Token OAuth ausente." };
    const started = Date.now();
    try {
      await this.request("/sites/MLB");
      return { status: "healthy", checkedAt: new Date().toISOString(), latencyMs: Date.now() - started, message: "API oficial respondeu corretamente." };
    } catch (error) {
      return { status: "unavailable", checkedAt: new Date().toISOString(), latencyMs: Date.now() - started, message: error instanceof Error ? error.message : "Falha desconhecida." };
    }
  }
}
