import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const schema = z.union([
  z.object({ offerId: z.string().min(1).max(100) }),
  z.object({ offerSourceId: z.string().min(1).max(100) })
]);
const requests = new Map<string, number[]>();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"; const now = Date.now();
  const recent = (requests.get(ip) ?? []).filter((time) => time > now - 60_000);
  if (recent.length >= 30) return new NextResponse(null, { status: 204 });
  recent.push(now); requests.set(ip, recent);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  const supabase = createAdminSupabaseClient();
  if (!parsed.success || !supabase) return new NextResponse(null, { status: 204 });
  let tracking: { offerId: string | null; providerId: string | null; destination: string } | null = null;
  if ("offerId" in parsed.data) {
    const { data } = await supabase.from("offers").select("id,source_provider_id,product_url,affiliate_url,affiliate_status").eq("id", parsed.data.offerId).maybeSingle();
    if (data) tracking = {
      offerId: String(data.id), providerId: data.source_provider_id ? String(data.source_provider_id) : null,
      destination: String(data.affiliate_status === "active" && data.affiliate_url ? data.affiliate_url : data.product_url)
    };
  } else {
    const { data } = await supabase.from("offer_sources").select("provider_id,original_url,affiliate_url,affiliate_status").eq("id", parsed.data.offerSourceId).maybeSingle();
    if (data) tracking = {
      offerId: null, providerId: data.provider_id ? String(data.provider_id) : null,
      destination: String(data.affiliate_status === "active" && data.affiliate_url ? data.affiliate_url : data.original_url)
    };
  }
  if (!tracking) return new NextResponse(null, { status: 204 });
  try { await supabase.from("outbound_events").insert({ offer_id: tracking.offerId, provider_id: tracking.providerId, destination_host: new URL(tracking.destination).hostname.toLowerCase() }); } catch { /* o clique nunca bloqueia o redirecionamento */ }
  return new NextResponse(null, { status: 204 });
}
