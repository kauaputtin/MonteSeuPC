import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { exchangeMercadoLivreCode } from "@/integrations/providers/mercado-livre/credentials";
import { getAdminAccess } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function equal(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? ""; const code = url.searchParams.get("code") ?? "";
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)ml_oauth_state=([^;]+)/)?.[1] ?? "";
  const access = await getAdminAccess();
  const target = new URL("/admin/integracoes", url.origin);
  if (!access.user || !state || !cookie || !equal(state, decodeURIComponent(cookie)) || !code) {
    target.searchParams.set("oauth", "invalid"); return NextResponse.redirect(target);
  }
  try {
    const redirectUri = new URL(url.pathname, url.origin).toString();
    await exchangeMercadoLivreCode(code, redirectUri);
    await createAdminSupabaseClient()?.from("admin_audit_log").insert({ user_id: access.user.id, action: "integration.oauth.connect", resource_type: "integration_provider", resource_id: "mercado-livre", metadata: {} });
    target.searchParams.set("oauth", "success");
  }
  catch { target.searchParams.set("oauth", "error"); }
  const response = NextResponse.redirect(target); response.cookies.set("ml_oauth_state", "", { path: "/api/integrations/mercado-livre", maxAge: 0 }); return response;
}
