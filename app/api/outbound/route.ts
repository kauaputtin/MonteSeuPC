import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { limitByIp, readJsonLimited } from "@/lib/security/request";

const schema = z.object({ offerId: z.string().min(1).max(100) });

// Métrica anônima de clique. Sempre responde 204 para nunca atrasar a navegação.
export async function POST(request: Request) {
  if (limitByIp(request, "outbound", 30, 60_000)) return new NextResponse(null, { status: 204 });
  const parsed = schema.safeParse(await readJsonLimited(request, 512).catch(() => null));
  const supabase = createAdminSupabaseClient();
  if (!parsed.success || !supabase) return new NextResponse(null, { status: 204 });
  const { data } = await supabase.from("offers").select("id,source_provider_id,product_url,affiliate_url,affiliate_status").eq("id", parsed.data.offerId).maybeSingle();
  if (!data) return new NextResponse(null, { status: 204 });
  const destination = data.affiliate_status === "active" && data.affiliate_url ? data.affiliate_url : data.product_url;
  try { await supabase.from("outbound_events").insert({ offer_id: data.id, provider_id: data.source_provider_id, destination_host: new URL(destination).hostname.toLowerCase() }); } catch { /* o clique nunca bloqueia o redirecionamento */ }
  return new NextResponse(null, { status: 204 });
}
