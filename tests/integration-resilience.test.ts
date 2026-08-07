import { afterEach, describe, expect, it, vi } from "vitest";
import { CircuitBreaker } from "@/integrations/core/circuit-breaker";
import { assertSafeProviderUrl, safeFetchJson } from "@/integrations/core/safe-fetch";
import { TokenBucketRateLimiter } from "@/integrations/core/rate-limiter";
import { HttpStatusError, withRetry } from "@/integrations/core/retry";
import { MercadoLivreProvider } from "@/integrations/providers/mercado-livre/provider";

afterEach(() => vi.restoreAllMocks());

describe("resiliência e segurança", () => {
  it("aplica token bucket por fonte", () => {
    let now = 0; const limiter = new TokenBucketRateLimiter({ capacity: 2, refillPerSecond: 1, now: () => now });
    expect(limiter.tryAcquire()).toBe(true); expect(limiter.tryAcquire()).toBe(true); expect(limiter.tryAcquire()).toBe(false);
    now = 1_000; expect(limiter.tryAcquire()).toBe(true);
  });

  it("refaz 429 com exponential backoff e respeita retry-after", async () => {
    let calls = 0; const delays: number[] = [];
    const value = await withRetry(async () => { calls++; if (calls < 3) throw new HttpStatusError(429, "limit", 20); return "ok"; }, { attempts: 3, sleep: async (delay) => { delays.push(delay); }, random: () => 0.5 });
    expect(value).toBe("ok"); expect(calls).toBe(3); expect(delays).toEqual([20, 20]);
  });

  it("não abre o circuit breaker para respostas 4xx esperadas", async () => {
    const breaker = new CircuitBreaker(2, 60_000, Date.now, (error) => !(error instanceof HttpStatusError) || error.status >= 500);
    await expect(breaker.execute(async () => { throw new HttpStatusError(404, "sem anúncios"); })).rejects.toMatchObject({ status: 404 });
    await expect(breaker.execute(async () => { throw new HttpStatusError(403, "detalhe bloqueado"); })).rejects.toMatchObject({ status: 403 });
    expect(breaker.state).toBe("closed");
    await expect(breaker.execute(async () => "ok")).resolves.toBe("ok");
  });

  it("bloqueia SSRF, IPs, credenciais e domínios fora da allowlist", () => {
    expect(() => assertSafeProviderUrl("http://api.mercadolibre.com/x", ["api.mercadolibre.com"])).toThrow();
    expect(() => assertSafeProviderUrl("https://127.0.0.1/x", ["127.0.0.1"])).toThrow();
    expect(() => assertSafeProviderUrl("https://user:pass@api.mercadolibre.com/x", ["api.mercadolibre.com"])).toThrow();
    expect(() => assertSafeProviderUrl("https://evil.example/x", ["api.mercadolibre.com"])).toThrow();
  });

  it("cancela uma resposta externa após o timeout", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: URL, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })));
    await expect(safeFetchJson("https://api.mercadolibre.com/test", { allowedHosts: ["api.mercadolibre.com"], timeoutMs: 5, attempts: 1 })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("mantém a fonte sem credencial desativada sem chamar a API", async () => {
    const provider = new MercadoLivreProvider(async () => null);
    expect(await provider.isConfigured()).toBe(false); expect((await provider.healthCheck()).status).toBe("not_configured");
  });
});
