import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/supabase/auth";

export async function GET() {
  if (!await verifyAdminRequest()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID?.trim();
  const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI?.trim();
  if (!clientId || !redirectUri) return NextResponse.json({ error: "Configure o client ID e a redirect URI do Mercado Livre." }, { status: 503 });
  const state = randomBytes(32).toString("base64url");
  const authorization = new URL("https://auth.mercadolivre.com.br/authorization");
  authorization.searchParams.set("response_type", "code"); authorization.searchParams.set("client_id", clientId);
  authorization.searchParams.set("redirect_uri", redirectUri); authorization.searchParams.set("state", state);
  const response = NextResponse.redirect(authorization);
  response.cookies.set("ml_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}
