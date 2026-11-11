import { NextResponse, type NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    try { return new URL(origin).host === request.nextUrl.host; } catch { return false; }
  }
  // Navegadores modernos sempre enviam Sec-Fetch-Site; sem Origin, aceita apenas same-origin.
  const site = request.headers.get("sec-fetch-site");
  return site === "same-origin" || site === "none";
}

/**
 * Bloqueia CSRF nas rotas de API que alteram dados: só aceita escrita vinda do
 * próprio site. O cron usa GET com Bearer e não passa por esta regra.
 */
export function proxy(request: NextRequest) {
  if (!SAFE_METHODS.has(request.method) && !sameOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
