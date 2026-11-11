import type {
  ExternalOffer,
  ExternalProduct,
  GetOffersInput,
  GetProductInput,
  ProviderCapabilities,
  ProviderHealth,
  SearchProductsInput
} from "@/integrations/types/external";

export interface ProductProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  isConfigured(): Promise<boolean>;
  searchProducts?(input: SearchProductsInput): Promise<ExternalProduct[]>;
  getProduct?(input: GetProductInput): Promise<ExternalProduct | null>;
  getOffers?(input: GetOffersInput): Promise<ExternalOffer[]>;
  healthCheck(): Promise<ProviderHealth>;
  /** Termos usados pela sincronização agendada quando o provider trabalha por busca. */
  defaultSyncQueries?(): string[];
  /** Providers de feed entregam o catálogo inteiro, lido em lotes a partir de um cursor. */
  listCatalog?(input: { offset: number; limit: number }): Promise<CatalogPage>;
}

export interface CatalogPage { products: ExternalProduct[]; total: number; nextOffset: number | null; }

export abstract class DisabledProvider implements ProductProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  readonly capabilities: ProviderCapabilities = {
    productSearch: false, productDetails: false, offers: false, stock: false,
    technicalSpecifications: false, images: false, affiliateLinks: false
  };
  async isConfigured() { return false; }
  async healthCheck(): Promise<ProviderHealth> {
    return { status: "not_configured", checkedAt: new Date().toISOString(), message: "Integração automática não configurada; use CSV ou cadastro manual autorizado." };
  }
}
