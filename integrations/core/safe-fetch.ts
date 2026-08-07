import { isIP } from "node:net";
import { HttpStatusError, withRetry } from "./retry";

export interface SafeFetchOptions {
  allowedHosts: string[];
  timeoutMs?: number;
  maxResponseBytes?: number;
  headers?: HeadersInit;
  method?: "GET" | "POST";
  body?: string;
  attempts?: number;
}

export function assertSafeProviderUrl(value: string, allowedHosts: string[]) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Integrações externas exigem HTTPS.");
  if (url.username || url.password || url.port) throw new Error("URL externa não permitida.");
  const hostname = url.hostname.toLowerCase();
  if (isIP(hostname) !== 0 || hostname === "localhost" || hostname.endsWith(".local")) throw new Error("Destino privado não permitido.");
  const allowed = allowedHosts.some((host) => host.startsWith("*.") ? hostname.endsWith(host.slice(1)) : hostname === host);
  if (!allowed) throw new Error(`Domínio não autorizado para o provider: ${hostname}`);
  return url;
}

async function readLimited(response: Response, maximumBytes: number) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maximumBytes) throw new Error("Resposta externa excede o limite permitido.");
  if (!response.body) return new Uint8Array(await response.arrayBuffer());
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) { await reader.cancel(); throw new Error("Resposta externa excede o limite permitido."); }
    chunks.push(value);
  }
  const merged = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return merged;
}

export async function safeFetchJson(value: string, options: SafeFetchOptions): Promise<unknown> {
  const url = assertSafeProviderUrl(value, options.allowedHosts);
  return withRetry(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);
    try {
      const response = await fetch(url, {
        method: options.method ?? "GET",
        headers: { Accept: "application/json", "User-Agent": "MonteSeuPC/1.0 (+https://github.com/kauaputtin/MonteSeuPC)", ...options.headers },
        body: options.body,
        signal: controller.signal,
        redirect: "error",
        cache: "no-store"
      });
      if (!response.ok) {
        const retryAfter = response.headers.get("retry-after");
        const retryAfterMs = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : undefined;
        throw new HttpStatusError(response.status, `Provider respondeu HTTP ${response.status}.`, retryAfterMs);
      }
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("application/json")) throw new Error("Content-Type externo inesperado.");
      const buffer = await readLimited(response, options.maxResponseBytes ?? 2_000_000);
      return JSON.parse(new TextDecoder().decode(buffer)) as unknown;
    } finally { clearTimeout(timeout); }
  }, { attempts: options.attempts ?? 3 });
}
