import "server-only";

import { NextResponse } from "next/server";
import { rateLimit } from "./rate-limit";

export class PayloadTooLargeError extends Error {
  constructor() { super("Corpo da requisição excede o limite permitido."); }
}

/** IP do cliente. Na Vercel, x-real-ip e x-forwarded-for são definidos pela borda. */
export function clientIp(request: Request) {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Lê JSON sem confiar em Content-Length e abortando acima de maxBytes. */
export async function readJsonLimited(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new PayloadTooLargeError();
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new PayloadTooLargeError(); }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  const text = new TextDecoder().decode(merged);
  return text ? JSON.parse(text) as unknown : null;
}

export function tooManyRequests(retryAfterSeconds: number, message = "Muitas requisições. Aguarde um instante.") {
  return NextResponse.json({ error: message }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
}

/** Atalho: aplica o limite por IP e devolve a resposta 429 quando estourar. */
export function limitByIp(request: Request, scope: string, limit: number, windowMs: number) {
  const result = rateLimit(`${scope}:${clientIp(request)}`, limit, windowMs);
  return result.allowed ? null : tooManyRequests(result.retryAfterSeconds);
}
