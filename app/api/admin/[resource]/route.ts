import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/supabase/auth";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/auth";
import { specificationsSchema } from "@/lib/validations/schemas";
import { invalidateCatalog } from "@/lib/catalog";

type Resource = "componentes" | "lojas" | "ofertas";
const tableMap: Record<Resource, "components" | "stores" | "offers"> = { componentes: "components", lojas: "stores", ofertas: "offers" };
const resourceSchema = z.enum(["componentes", "lojas", "ofertas"]);
const specificationKindByCategory: Record<string, string> = { processador: "processor", "placa-mae": "motherboard", "memoria-ram": "memory", "placa-de-video": "gpu", armazenamento: "storage", fonte: "psu", gabinete: "case", cooler: "cooler" };
const baseComponent = z.object({ brand: z.string().trim().min(2), name: z.string().trim().min(2), slug: z.string().regex(/^[a-z0-9-]+$/), categorySlug: z.string().min(2), description: z.string().min(10), imageUrl: z.string().min(1), estimatedWatts: z.number().nonnegative(), specifications: specificationsSchema, specificationStatus: z.enum(["verified", "partial", "unverified"]).default("unverified"), specificationSources: z.array(z.url()).max(20).default([]), active: z.boolean() }).refine((value) => value.specificationStatus !== "verified" || value.specificationSources.length > 0, { message: "Uma fonte técnica é obrigatória para marcar como verificada." }).refine((value) => specificationKindByCategory[value.categorySlug] === value.specifications.kind, { message: "As especificações não correspondem à categoria." });
const baseStore = z.object({ name: z.string().trim().min(2), slug: z.string().regex(/^[a-z0-9-]+$/), websiteUrl: z.url(), logoUrl: z.url().nullable(), active: z.boolean() });
const baseOffer = z.object({ componentId: z.string().min(1), storeId: z.string().min(1), price: z.number().positive(), pixPrice: z.number().positive().nullable(), originalPrice: z.number().positive().nullable().default(null), installmentPrice: z.number().positive().nullable().default(null), installments: z.number().int().min(1).max(36).nullable().default(null), shippingPrice: z.number().nonnegative().nullable().default(null), productUrl: z.url(), affiliateUrl: z.url().nullable().default(null), affiliateProgram: z.string().trim().max(100).nullable().default(null), affiliateCampaignId: z.string().trim().max(100).nullable().default(null), sellerName: z.string().trim().max(200).nullable().default(null), condition: z.enum(["new", "used", "refurbished", "open_box", "unknown"]).default("new"), stockQuantity: z.number().int().nonnegative().nullable().default(null), affiliate: z.boolean(), available: z.boolean() }).refine((value) => (value.installmentPrice === null) === (value.installments === null), { message: "Parcela e quantidade devem ser informadas juntas." });

async function context(params: Promise<{ resource: string }>) {
  const parsed = resourceSchema.safeParse((await params).resource);
  if (!parsed.success) return null;
  if (!await verifyAdminRequest()) return null;
  const supabase = await createAuthenticatedSupabaseClient();
  return supabase ? { resource: parsed.data, supabase } : null;
}

async function audit(supabase: NonNullable<Awaited<ReturnType<typeof createAuthenticatedSupabaseClient>>>, action: string, resource: Resource, resourceId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("admin_audit_log").insert({ user_id: user.id, action, resource_type: resource, resource_id: resourceId ?? null, metadata: {} });
}

export async function GET(_request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const ctx = await context(params);
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (ctx.resource === "componentes") {
    const { data, error } = await ctx.supabase.from("components").select("*, categories(slug)").order("updated_at", { ascending: false }).limit(500);
    if (error) return NextResponse.json({ error: "Falha ao consultar registros." }, { status: 500 });
    const items = (data ?? []).map((item) => ({ ...item, category_slug: (item.categories as { slug?: string } | null)?.slug }));
    return NextResponse.json({ items });
  }
  const { data, error } = await ctx.supabase.from(tableMap[ctx.resource]).select("*").order("updated_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: "Falha ao consultar registros." }, { status: 500 });
  return NextResponse.json({ items: data });
}

async function mapPayload(resource: Resource, body: unknown, supabase: NonNullable<Awaited<ReturnType<typeof createAuthenticatedSupabaseClient>>>) {
  if (resource === "componentes") {
    const value = baseComponent.parse(body);
    const { data: category } = await supabase.from("categories").select("id").eq("slug", value.categorySlug).single();
    if (!category) throw new Error("Categoria inválida.");
    return { category_id: category.id, brand: value.brand, name: value.name, slug: value.slug, description: value.description, image_url: value.imageUrl, specifications: value.specifications, specification_status: value.specificationStatus, specification_sources: value.specificationSources, estimated_watts: value.estimatedWatts, active: value.active, is_demo: false };
  }
  if (resource === "lojas") {
    const value = baseStore.parse(body);
    return { name: value.name, slug: value.slug, website_url: value.websiteUrl, logo_url: value.logoUrl, active: value.active };
  }
  const value = baseOffer.parse(body);
  return { component_id: value.componentId, store_id: value.storeId, price: value.price, pix_price: value.pixPrice, original_price: value.originalPrice, installment_price: value.installmentPrice, installments: value.installments, shipping_price: value.shippingPrice, product_url: value.productUrl, original_url: value.productUrl, affiliate_url: value.affiliateUrl, affiliate_program: value.affiliateProgram, affiliate_campaign_id: value.affiliateCampaignId, affiliate_status: value.affiliateUrl ? "active" : null, seller_name: value.sellerName, condition: value.condition, stock_quantity: value.stockQuantity, affiliate: value.affiliate && Boolean(value.affiliateUrl), available: value.available, last_checked_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), consecutive_failures: 0 };
}

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const ctx = await context(params);
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    let payload: Record<string, unknown> = await mapPayload(ctx.resource, await request.json(), ctx.supabase);
    if (ctx.resource === "ofertas" && "affiliate_url" in payload && payload.affiliate_url) payload = { ...payload, affiliate_created_at: new Date().toISOString() };
    // O recurso e o payload são validados em conjunto acima; o cliente sem tipos gerados
    // não consegue preservar essa correlação ao receber um nome de tabela dinâmico.
    const { data, error } = await ctx.supabase.from(tableMap[ctx.resource]).insert(payload as never).select("*").single();
    if (error) throw error;
    await audit(ctx.supabase, "resource.create", ctx.resource, String(data.id));
    invalidateCatalog();
    return NextResponse.json({ item: data }, { status: 201 });
  } catch { return NextResponse.json({ error: "Dados inválidos ou registro duplicado." }, { status: 400 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const ctx = await context(params);
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
  try {
    let payload: Record<string, unknown> = await mapPayload(ctx.resource, await request.json(), ctx.supabase);
    if (ctx.resource === "ofertas" && "affiliate_url" in payload && payload.affiliate_url) {
      const { data: current } = await ctx.supabase.from("offers").select("affiliate_created_at").eq("id", id).maybeSingle();
      payload = { ...payload, affiliate_created_at: current?.affiliate_created_at ?? new Date().toISOString() };
    }
    const { data, error } = await ctx.supabase.from(tableMap[ctx.resource]).update(payload as never).eq("id", id).select("*").single();
    if (error) throw error;
    await audit(ctx.supabase, "resource.update", ctx.resource, id);
    invalidateCatalog();
    return NextResponse.json({ item: data });
  } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const ctx = await context(params);
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
  const field = ctx.resource === "ofertas" ? "available" : "active";
  const { error } = await ctx.supabase.from(tableMap[ctx.resource]).update({ [field]: false }).eq("id", id);
  if (error) return NextResponse.json({ error: "Não foi possível desativar." }, { status: 500 });
  await audit(ctx.supabase, "resource.deactivate", ctx.resource, id);
  invalidateCatalog();
  return NextResponse.json({ ok: true });
}
