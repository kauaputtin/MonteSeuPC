import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/supabase/auth";

const CALLBACK_PATH = "/api/integrations/mercado-livre/callback";

export async function GET(request: Request) {
  if (!await verifyAdminRequest()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID?.trim();
  if (!clientId) return NextResponse.json({ error: "Variável ausente neste deployment: MERCADO_LIVRE_CLIENT_ID." }, { status: 503 });
  const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI?.trim() || new URL(CALLBACK_PATH, request.url).toString();
  let callback: URL;
  try { callback = new URL(redirectUri); }
  catch { return NextResponse.json({ error: "MERCADO_LIVRE_REDIRECT_URI não é uma URL válida." }, { status: 503 }); }
  if (!["http:", "https:"].includes(callback.protocol) || callback.pathname !== CALLBACK_PATH || callback.search || callback.hash) {
    const expected = new URL(CALLBACK_PATH, callback.origin).toString();
    return NextResponse.json({ error: `MERCADO_LIVRE_REDIRECT_URI deve ser exatamente ${expected} e ter o mesmo valor cadastrado no aplicativo do Mercado Livre.` }, { status: 503 });
  }
  const state = randomBytes(32).toString("base64url");
  const authorization = new URL("https://auth.mercadolivre.com.br/authorization");
  authorization.searchParams.set("response_type", "code"); authorization.searchParams.set("client_id", clientId);
  authorization.searchParams.set("redirect_uri", redirectUri); authorization.searchParams.set("state", state);
  const response = NextResponse.redirect(authorization);
  response.cookies.set("ml_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}
