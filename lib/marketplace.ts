import "server-only";

import { connection } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { CategorySlug } from "@/types/domain";

export interface MarketplaceOffer {
  id: string;
  externalId: string;
  price: number;
  originalPrice?: number;
  condition: string;
  url: string;
  fetchedAt: string;
}

export interface MarketplaceProduct {
  id: string;
  externalId: string;
  title: string;
  brand?: string;
  model?: string;
  categorySlug: CategorySlug;
  categoryName: string;
  imageUrl: string;
  offers: MarketplaceOffer[];
  fetchedAt: string;
}

const marketplaceCategories: Record<string, { slug: CategorySlug; name: string }> = {
  "MLB-COMPUTER_PROCESSORS": { slug: "processador", name: "Processadores" },
  "MLB-COMPUTER_MOTHERBOARDS": { slug: "placa-mae", name: "Placas-mãe" },
  "MLB-RAM_MEMORY_MODULES": { slug: "memoria-ram", name: "Memórias RAM" },
  "MLB-GRAPHICS_CARDS": { slug: "placa-de-video", name: "Placas de vídeo" },
  "MLB-HARD_DRIVES_AND_SSDS": { slug: "armazenamento", name: "Armazenamento" },
  "MLB-DESKTOP_COMPUTER_POWER_SUPPLIES": { slug: "fonte", name: "Fontes" },
  "MLB-DESKTOP_COMPUTER_CASES": { slug: "gabinete", name: "Gabinetes" },
  "MLB-DESKTOP_COMPUTER_COOLERS_AND_FANS": { slug: "cooler", name: "Coolers" }
};

export const marketplaceCategoryFilters = Object.values(marketplaceCategories).filter((item, index, values) =>
  values.findIndex((candidate) => candidate.slug === item.slug) === index
);

function safeUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch { return null; }
}

function safeImage(value: unknown, category: CategorySlug) {
  const url = safeUrl(value);
  if (!url) return `/products/${category}.svg`;
  const host = new URL(url).hostname.toLowerCase();
  return host === "http2.mlstatic.com" ? url : `/products/${category}.svg`;
}

export async function getMarketplaceProducts(): Promise<MarketplaceProduct[]> {
  await connection();
  const supabase = createAdminSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("external_products").select(
    "id,external_id,title,brand,model,category,image_url,fetched_at,offer_sources!inner(id,external_offer_id,price,original_price,condition,original_url,active,fetched_at)"
  ).eq("provider_id", "mercado-livre").eq("offer_sources.active", true).order("fetched_at", { ascending: false }).limit(200);
  if (error) {
    console.error(JSON.stringify({ event: "marketplace.products.failed", error: error.message }));
    return [];
  }
  return (data ?? []).flatMap((row): MarketplaceProduct[] => {
    const category = marketplaceCategories[String(row.category)];
    if (!category) return [];
    const offers = (row.offer_sources ?? []).flatMap((source): MarketplaceOffer[] => {
      const price = Number(source.price);
      const url = safeUrl(source.original_url);
      if (!source.active || !Number.isFinite(price) || price <= 0 || !url) return [];
      const originalPrice = source.original_price == null ? undefined : Number(source.original_price);
      return [{
        id: String(source.id), externalId: String(source.external_offer_id), price,
        originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
        condition: String(source.condition ?? "unknown"), url, fetchedAt: String(source.fetched_at)
      }];
    }).sort((left, right) => left.price - right.price);
    if (!offers.length) return [];
    return [{
      id: String(row.id), externalId: String(row.external_id), title: String(row.title),
      brand: row.brand ? String(row.brand) : undefined, model: row.model ? String(row.model) : undefined,
      categorySlug: category.slug, categoryName: category.name, imageUrl: safeImage(row.image_url, category.slug),
      offers, fetchedAt: String(row.fetched_at)
    }];
  });
}
