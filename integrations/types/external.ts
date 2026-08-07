import type { CategorySlug } from "@/types/domain";

export type ProductCondition = "new" | "used" | "refurbished" | "open_box" | "unknown";
export type ProviderConfigurationStatus = "configured" | "missing_credentials" | "manual_only" | "disabled" | "error";

export interface ProviderCapabilities {
  productSearch: boolean;
  productDetails: boolean;
  offers: boolean;
  stock: boolean;
  technicalSpecifications: boolean;
  images: boolean;
  affiliateLinks: boolean;
}

export interface ExternalOffer {
  providerId: string;
  externalId: string;
  sellerExternalId?: string;
  sellerName?: string;
  price: number;
  pixPrice?: number;
  originalPrice?: number;
  installmentPrice?: number;
  installments?: number;
  shippingPrice?: number;
  currency: "BRL";
  available: boolean;
  stockQuantity?: number;
  condition: ProductCondition;
  productUrl: string;
  affiliateUrl?: string;
  affiliateProgram?: string;
  fetchedAt: string;
}

export interface ExternalProduct {
  providerId: string;
  externalId: string;
  externalSku?: string;
  gtin?: string;
  ean?: string;
  mpn?: string;
  brand?: string;
  title: string;
  model?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  productUrl: string;
  specifications: Record<string, unknown>;
  offers: ExternalOffer[];
  rawPayload?: unknown;
  fetchedAt: string;
}

export interface SearchProductsInput {
  query: string;
  category?: CategorySlug;
  limit?: number;
  offset?: number;
}

export interface GetProductInput { externalId: string; }
export interface GetOffersInput { externalProductId: string; limit?: number; }

export interface ProviderHealth {
  status: "healthy" | "degraded" | "unavailable" | "not_configured";
  checkedAt: string;
  latencyMs?: number;
  message: string;
}

export interface NormalizationResult {
  categorySlug: CategorySlug | null;
  brand: string | null;
  model: string | null;
  specifications: Record<string, unknown>;
  verifiedFields: string[];
  missingCriticalFields: string[];
  status: "verified" | "partial" | "unverified";
}

export interface MatchCandidate {
  componentId: string;
  confidence: number;
  reasons: string[];
  reliableIdentifier: boolean;
  blockedByVariation: boolean;
}

export interface SyncMetrics {
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsIgnored: number;
  errorsCount: number;
}
