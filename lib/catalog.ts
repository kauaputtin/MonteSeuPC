import "server-only";

import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { categories as demoCategories, components as demoComponents, offers as demoOffers, stores as demoStores } from "@/data/mock-data";
import { specificationsSchema } from "@/lib/validations/schemas";
import { createPublicSupabaseClient } from "@/lib/supabase/server";
import { getEffectiveOfferPrice } from "@/lib/offers";
import { categorySlugs, type CatalogData, type Category, type CategorySlug, type Component, type Offer, type Store } from "@/types/domain";

export const CATALOG_TAG = "catalog";
/** Segundos até o snapshot do catálogo ser refeito mesmo sem sincronização nova. */
export const CATALOG_REVALIDATE_SECONDS = 120;

const PAGE_SIZE = 1000;
const MAX_PAGES = 30;
const OFFERS_PER_COMPONENT = 8;
const NON_NEW_OFFERS_PER_COMPONENT = 3;

const COMPONENT_COLUMNS = "id,category_id,brand,name,slug,description,image_url,specifications,estimated_watts,active,gtin,ean,mpn,model_normalized,specification_status";
const OFFER_COLUMNS = "id,component_id,store_id,price,pix_price,installment_price,installments,shipping_price,product_url,affiliate,available,last_checked_at,original_price,original_url,affiliate_url,affiliate_status,seller_name,condition,stale_at,source_provider_id";

function fallback(): CatalogData {
  return { categories: demoCategories, components: demoComponents, stores: demoStores, offers: demoOffers, source: "demo", generatedAt: new Date().toISOString() };
}

function isCategorySlug(value: unknown): value is CategorySlug {
  return typeof value === "string" && categorySlugs.includes(value as CategorySlug);
}

const allowedImageHosts = ["http2.mlstatic.com", "images.kabum.com.br"];
function safeImageUrl(value: unknown, category: CategorySlug) {
  if (typeof value !== "string") return `/products/${category}.svg`;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol === "https:" && (allowedImageHosts.includes(host) || host.endsWith(".media-amazon.com") || host.endsWith(".supabase.co"))) return url.toString();
  } catch { /* usa ilustração local */ }
  return `/products/${category}.svg`;
}

// Linhas do PostgREST sem tipos gerados; cada campo é convertido explicitamente abaixo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type PageQuery = (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: unknown }>;

/** O PostgREST corta em 1000 linhas por padrão: pagina até trazer tudo. */
async function selectAll(query: PageQuery) {
  const rows: Row[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

/** Mantém só as ofertas que a interface realmente usa: as mais baratas de cada peça. */
function trimOffers(offers: Offer[]) {
  const byComponent = new Map<string, Offer[]>();
  for (const offer of offers) {
    const list = byComponent.get(offer.componentId);
    if (list) list.push(offer); else byComponent.set(offer.componentId, [offer]);
  }
  const kept: Offer[] = [];
  for (const list of byComponent.values()) {
    list.sort((left, right) => getEffectiveOfferPrice(left) - getEffectiveOfferPrice(right));
    const fresh = list.filter((offer) => !offer.condition || offer.condition === "new").slice(0, OFFERS_PER_COMPONENT);
    const other = list.filter((offer) => offer.condition && offer.condition !== "new").slice(0, NON_NEW_OFFERS_PER_COMPONENT);
    kept.push(...fresh, ...other);
  }
  return kept;
}

async function loadCatalog(): Promise<CatalogData> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return fallback();
  try {
    const [categoryRows, componentRows, storeRows, offerRows] = await Promise.all([
      selectAll((from, to) => supabase.from("categories").select("id,name,slug,sort_order").order("sort_order").range(from, to)),
      selectAll((from, to) => supabase.from("components").select(COMPONENT_COLUMNS).eq("active", true).eq("is_demo", false).order("id").range(from, to)),
      selectAll((from, to) => supabase.from("stores").select("id,name,slug,logo_url,website_url,active").eq("active", true).range(from, to)),
      selectAll((from, to) => supabase.from("offers").select(OFFER_COLUMNS).eq("available", true).is("stale_at", null).order("id").range(from, to))
    ]);

    const categories = categoryRows.flatMap((row): Category[] => {
      if (!isCategorySlug(row.slug)) return [];
      const demo = demoCategories.find((item) => item.slug === row.slug);
      return [{ id: String(row.id), name: String(row.name), slug: row.slug, sortOrder: Number(row.sort_order), description: demo?.description ?? "Componente do catálogo." }];
    });
    const categoryById = new Map(categories.map((category) => [category.id, category.slug]));
    const components = componentRows.flatMap((row): Component[] => {
      const categorySlug = categoryById.get(String(row.category_id));
      const specs = specificationsSchema.safeParse(row.specifications);
      if (!categorySlug || !specs.success) return [];
      return [{
        id: String(row.id), categorySlug, brand: String(row.brand), name: String(row.name), slug: String(row.slug),
        description: String(row.description ?? "").slice(0, 600), imageUrl: safeImageUrl(row.image_url, categorySlug), specifications: specs.data,
        estimatedWatts: Number(row.estimated_watts), active: Boolean(row.active), gtin: row.gtin ?? undefined,
        ean: row.ean ?? undefined, mpn: row.mpn ?? undefined, model: row.model_normalized ?? undefined,
        specificationStatus: row.specification_status ?? "verified"
      }];
    });
    if (!categories.length || !components.length) return fallback();

    const stores = storeRows.map((row): Store => ({
      id: String(row.id), name: String(row.name), slug: String(row.slug), logoUrl: row.logo_url ?? undefined,
      websiteUrl: String(row.website_url), active: Boolean(row.active)
    }));
    const componentIds = new Set(components.map((item) => item.id));
    const storeIds = new Set(stores.map((item) => item.id));
    const offers = trimOffers(offerRows.flatMap((row): Offer[] => {
      if (!componentIds.has(String(row.component_id)) || !storeIds.has(String(row.store_id))) return [];
      return [{
        id: String(row.id), componentId: String(row.component_id), storeId: String(row.store_id), price: Number(row.price),
        pixPrice: row.pix_price == null ? undefined : Number(row.pix_price), installmentPrice: row.installment_price == null ? undefined : Number(row.installment_price),
        installments: row.installments ?? undefined, shippingPrice: row.shipping_price == null ? undefined : Number(row.shipping_price),
        productUrl: String(row.product_url), affiliate: Boolean(row.affiliate), available: Boolean(row.available), lastCheckedAt: String(row.last_checked_at),
        originalPrice: row.original_price == null ? undefined : Number(row.original_price), originalUrl: row.original_url ?? undefined,
        affiliateUrl: row.affiliate_url ?? undefined, affiliateStatus: row.affiliate_status ?? undefined,
        sellerName: row.seller_name ?? undefined, condition: row.condition ?? "unknown",
        staleAt: row.stale_at ?? undefined, sourceProviderId: row.source_provider_id ?? undefined
      }];
    }));
    // Peças sem nenhuma oferta viva não ajudam quem está montando: ficam fora da vitrine.
    const withOffers = new Set(offers.map((offer) => offer.componentId));
    const visibleComponents = components.filter((component) => withOffers.has(component.id));
    const pricesCheckedAt = offers.reduce<string | undefined>((latest, offer) => !latest || offer.lastCheckedAt > latest ? offer.lastCheckedAt : latest, undefined);
    return {
      categories, components: visibleComponents.length ? visibleComponents : components, stores, offers, source: "supabase",
      generatedAt: new Date().toISOString(), pricesCheckedAt
    };
  } catch (error) {
    console.error(JSON.stringify({ event: "catalog.load.failed", error: error instanceof Error ? error.message : String(error) }));
    return fallback();
  }
}

const loadCachedCatalog = unstable_cache(loadCatalog, ["catalog-v2"], { tags: [CATALOG_TAG], revalidate: CATALOG_REVALIDATE_SECONDS });

/** Snapshot em cache compartilhado + deduplicação dentro da mesma renderização. */
export const getCatalogData = cache(() => loadCachedCatalog());

/** Chamar depois de qualquer escrita no catálogo (sync, CSV, painel). */
export function invalidateCatalog() {
  try { revalidateTag(CATALOG_TAG, { expire: 0 }); } catch { /* fora de um contexto Next (testes/scripts) */ }
}
