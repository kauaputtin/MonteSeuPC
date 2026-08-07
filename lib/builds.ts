import { Buffer } from "node:buffer";
import { categories, components, offers } from "@/data/mock-data";
import { calculateBuildTotal } from "@/lib/calculations";
import { getCatalogData } from "@/lib/catalog";
import { calculateEstimatedWatts, calculateRecommendedPsuWatts } from "@/lib/compatibility/compatibility-engine";
import { createAdminSupabaseClient, createPublicSupabaseClient } from "@/lib/supabase/server";
import type { BuildPayload, CatalogData, PublicBuild, SelectedComponents, SelectedOffers } from "@/types/domain";

function resolveFromCatalog(payload: BuildPayload, catalog: CatalogData) {
  const selectedComponents: SelectedComponents = {};
  const selectedOffers: SelectedOffers = {};
  for (const [category, id] of Object.entries(payload.components)) {
    const found = catalog.components.find((item) => item.id === id && item.categorySlug === category && item.active);
    if (!found) throw new Error(`Componente inválido na categoria ${category}.`);
    selectedComponents[category as keyof SelectedComponents] = found;
  }
  for (const [category, id] of Object.entries(payload.offers)) {
    const component = selectedComponents[category as keyof SelectedComponents];
    const found = catalog.offers.find((item) => item.id === id && item.available && !item.staleAt && item.componentId === component?.id);
    if (!found) throw new Error(`Oferta inválida na categoria ${category}.`);
    selectedOffers[category as keyof SelectedOffers] = found;
  }
  return { selectedComponents, selectedOffers };
}

export async function resolveBuildPayload(payload: BuildPayload) { return resolveFromCatalog(payload, await getCatalogData()); }

export function encodeDemoBuild(payload: BuildPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeDemoBuild(value: string): PublicBuild | null {
  try {
    if (value.length > 6000) return null;
    const payload = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as BuildPayload;
    const { selectedComponents, selectedOffers } = resolveFromCatalog(payload, { categories, components, offers, stores: [], source: "demo" });
    return { publicId: "demo", name: payload.name, components: selectedComponents, offers: selectedOffers, createdAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

export async function savePublicBuild(payload: BuildPayload) {
  const catalog = await getCatalogData();
  const { selectedComponents, selectedOffers } = resolveFromCatalog(payload, catalog);
  const supabase = createAdminSupabaseClient();
  if (!supabase) return { path: `/montagem/demo?data=${encodeURIComponent(encodeDemoBuild(payload))}`, persistent: false };

  const publicId = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  const total = calculateBuildTotal(selectedComponents, selectedOffers, catalog.offers);
  const { data: build, error } = await supabase.from("builds").insert({
    public_id: publicId,
    name: payload.name,
    estimated_watts: calculateEstimatedWatts(selectedComponents),
    recommended_psu_watts: calculateRecommendedPsuWatts(selectedComponents),
    total_price: total
  }).select("id").single();
  if (error || !build) throw new Error("Não foi possível salvar a montagem.");

  const items = Object.entries(selectedComponents).flatMap(([categorySlug, component]) => {
    if (!component) return [];
    const category = catalog.categories.find((item) => item.slug === categorySlug);
    const offer = selectedOffers[categorySlug as keyof SelectedOffers];
    if (!category) return [];
    return [{
      build_id: build.id,
      category_id: category.id,
      component_id: component.id,
      offer_id: offer?.id ?? null,
      price_snapshot: offer ? (offer.pixPrice ?? offer.price) : null
    }];
  });
  const { error: itemError } = await supabase.from("build_items").insert(items);
  if (itemError) {
    await supabase.from("builds").delete().eq("id", build.id);
    throw new Error("Não foi possível salvar os itens da montagem.");
  }
  return { path: `/montagem/${publicId}`, persistent: true };
}

interface DbBuildItem {
  component_id: string;
  offer_id: string | null;
}

export async function getPublicBuild(publicId: string, catalog?: CatalogData): Promise<PublicBuild | null> {
  const activeCatalog = catalog ?? await getCatalogData();
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;
  const { data: build, error } = await supabase.from("builds").select("id, public_id, name, created_at").eq("public_id", publicId).single();
  if (error || !build) return null;
  const { data: items, error: itemsError } = await supabase.from("build_items").select("component_id, offer_id").eq("build_id", build.id);
  if (itemsError) return null;
  const selectedComponents: SelectedComponents = {};
  const selectedOffers: SelectedOffers = {};
  for (const item of (items ?? []) as DbBuildItem[]) {
    const component = activeCatalog.components.find((candidate) => candidate.id === item.component_id);
    if (!component) continue;
    selectedComponents[component.categorySlug] = component;
    const offer = activeCatalog.offers.find((candidate) => candidate.id === item.offer_id);
    if (offer) selectedOffers[component.categorySlug] = offer;
  }
  return { publicId: build.public_id as string, name: build.name as string, components: selectedComponents, offers: selectedOffers, createdAt: build.created_at as string };
}
