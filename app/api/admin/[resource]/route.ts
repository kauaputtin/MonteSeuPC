import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/supabase/auth";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/auth";

type Resource = "componentes" | "lojas" | "ofertas";
const tableMap: Record<Resource, "components" | "stores" | "offers"> = { componentes: "components", lojas: "stores", ofertas: "offers" };
const resourceSchema = z.enum(["componentes", "lojas", "ofertas"]);
const baseComponent = z.object({ brand: z.string().trim().min(2), name: z.string().trim().min(2), slug: z.string().regex(/^[a-z0-9-]+$/), categorySlug: z.string().min(2), description: z.string().min(10), imageUrl: z.string().min(1), estimatedWatts: z.number().nonnegative(), specifications: z.record(z.string(), z.unknown()), active: z.boolean() });
const baseStore = z.object({ name: z.string().trim().min(2), slug: z.string().regex(/^[a-z0-9-]+$/), websiteUrl: z.url(), logoUrl: z.url().nullable(), active: z.boolean() });
const baseOffer = z.object({ componentId: z.string().min(1), storeId: z.string().min(1), price: z.number().positive(), pixPrice: z.number().positive().nullable(), productUrl: z.url(), affiliate: z.boolean(), available: z.boolean() });

async function context(params: Promise<{ resource: string }>) {
  const parsed = resourceSchema.safeParse((await params).resource);
  if (!parsed.success) return null;
  if (!await verifyAdminRequest()) return null;
  const supabase = await createAuthenticatedSupabaseClient();
  return supabase ? { resource: parsed.data, supabase } : null;
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
    return { category_id: category.id, brand: value.brand, name: value.name, slug: value.slug, description: value.description, image_url: value.imageUrl, specifications: value.specifications, estimated_watts: value.estimatedWatts, active: value.active };
  }
  if (resource === "lojas") {
    const value = baseStore.parse(body);
    return { name: value.name, slug: value.slug, website_url: value.websiteUrl, logo_url: value.logoUrl, active: value.active };
  }
  const value = baseOffer.parse(body);
  return { component_id: value.componentId, store_id: value.storeId, price: value.price, pix_price: value.pixPrice, product_url: value.productUrl, affiliate: value.affiliate, available: value.available, last_checked_at: new Date().toISOString() };
}

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const ctx = await context(params);
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const payload = await mapPayload(ctx.resource, await request.json(), ctx.supabase);
    // O recurso e o payload são validados em conjunto acima; o cliente sem tipos gerados
    // não consegue preservar essa correlação ao receber um nome de tabela dinâmico.
    const { data, error } = await ctx.supabase.from(tableMap[ctx.resource]).insert(payload as never).select("*").single();
    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch { return NextResponse.json({ error: "Dados inválidos ou registro duplicado." }, { status: 400 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const ctx = await context(params);
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
  try {
    const payload = await mapPayload(ctx.resource, await request.json(), ctx.supabase);
    const { data, error } = await ctx.supabase.from(tableMap[ctx.resource]).update(payload as never).eq("id", id).select("*").single();
    if (error) throw error;
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
  return NextResponse.json({ ok: true });
}
