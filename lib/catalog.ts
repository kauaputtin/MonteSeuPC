import "server-only";

import { connection } from "next/server";
import { categories as demoCategories, components as demoComponents, offers as demoOffers, stores as demoStores } from "@/data/mock-data";
import { specificationsSchema } from "@/lib/validations/schemas";
import { createPublicSupabaseClient } from "@/lib/supabase/server";
import { categorySlugs, type CatalogData, type Category, type CategorySlug, type Component, type Offer, type Store } from "@/types/domain";

const fallback: CatalogData = { categories: demoCategories, components: demoComponents, stores: demoStores, offers: demoOffers, source: "demo" };

function isCategorySlug(value: unknown): value is CategorySlug {
  return typeof value === "string" && categorySlugs.includes(value as CategorySlug);
}

function safeImageUrl(value: unknown, category: CategorySlug) {
  if (typeof value !== "string") return `/products/${category}.svg`;
  if (value.startsWith("/")) return value;
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host === "http2.mlstatic.com" || host.endsWith(".media-amazon.com") || host.endsWith(".supabase.co")) return value;
  } catch { /* usa ilustração local */ }
  return `/products/${category}.svg`;
}

export async function getCatalogData(): Promise<CatalogData> {
  // O catálogo muda por sincronizações executadas depois do deploy. Sem este
  // marcador o Next pode congelar o resultado do Supabase durante o build.
  await connection();
  const supabase = createPublicSupabaseClient();
  if (!supabase) return fallback;

  const [categoryResult, componentResult, storeResult, offerResult] = await Promise.all([
    supabase.from("categories").select("id,name,slug,sort_order").order("sort_order"),
    supabase.from("components").select("*").eq("active", true),
    supabase.from("stores").select("*").eq("active", true),
    supabase.from("offers").select("*").eq("available", true).is("stale_at", null)
  ]);
  if (categoryResult.error || componentResult.error || storeResult.error || offerResult.error) return fallback;

  const categories = (categoryResult.data ?? []).flatMap((row): Category[] => {
    if (!isCategorySlug(row.slug)) return [];
    const demo = demoCategories.find((item) => item.slug === row.slug);
    return [{ id: String(row.id), name: String(row.name), slug: row.slug, sortOrder: Number(row.sort_order), description: demo?.description ?? "Componente do catálogo." }];
  });
  const categoryById = new Map(categories.map((category) => [category.id, category.slug]));
  const databaseComponentRows = (componentResult.data ?? []).filter((row) => !row.is_demo);
  if (!databaseComponentRows.length) return fallback;
  const components = databaseComponentRows.flatMap((row): Component[] => {
    const categorySlug = categoryById.get(String(row.category_id));
    const specs = specificationsSchema.safeParse(row.specifications);
    if (!categorySlug || !specs.success) return [];
    return [{
      id: String(row.id), categorySlug, brand: String(row.brand), name: String(row.name), slug: String(row.slug),
      description: String(row.description ?? ""), imageUrl: safeImageUrl(row.image_url, categorySlug), specifications: specs.data,
      estimatedWatts: Number(row.estimated_watts), active: Boolean(row.active), gtin: row.gtin ?? undefined,
      ean: row.ean ?? undefined, mpn: row.mpn ?? undefined, model: row.model_normalized ?? undefined,
      specificationStatus: row.specification_status ?? "verified",
      specificationSources: Array.isArray(row.specification_sources) ? row.specification_sources.filter((item: unknown): item is string => typeof item === "string") : []
    }];
  });
  const stores = (storeResult.data ?? []).map((row): Store => ({
    id: String(row.id), name: String(row.name), slug: String(row.slug), logoUrl: row.logo_url ?? undefined,
    websiteUrl: String(row.website_url), active: Boolean(row.active)
  }));
  const componentIds = new Set(components.map((item) => item.id));
  const storeIds = new Set(stores.map((item) => item.id));
  const offers = (offerResult.data ?? []).flatMap((row): Offer[] => {
    if (!componentIds.has(String(row.component_id)) || !storeIds.has(String(row.store_id))) return [];
    return [{
      id: String(row.id), componentId: String(row.component_id), storeId: String(row.store_id), price: Number(row.price),
      pixPrice: row.pix_price == null ? undefined : Number(row.pix_price), installmentPrice: row.installment_price == null ? undefined : Number(row.installment_price),
      installments: row.installments ?? undefined, shippingPrice: row.shipping_price == null ? undefined : Number(row.shipping_price),
      productUrl: String(row.product_url), affiliate: Boolean(row.affiliate), available: Boolean(row.available), lastCheckedAt: String(row.last_checked_at),
      originalPrice: row.original_price == null ? undefined : Number(row.original_price), originalUrl: row.original_url ?? undefined,
      affiliateUrl: row.affiliate_url ?? undefined, affiliateProgram: row.affiliate_program ?? undefined,
      affiliateCampaignId: row.affiliate_campaign_id ?? undefined, affiliateStatus: row.affiliate_status ?? undefined,
      sellerExternalId: row.seller_external_id ?? undefined, sellerName: row.seller_name ?? undefined,
      condition: row.condition ?? "unknown", stockQuantity: row.stock_quantity ?? undefined,
      staleAt: row.stale_at ?? undefined, sourceProviderId: row.source_provider_id ?? undefined
    }];
  });
  return categories.length && components.length ? { categories, components, stores, offers, source: "supabase" } : fallback;
}
