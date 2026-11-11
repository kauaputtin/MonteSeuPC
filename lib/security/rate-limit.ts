import "server-only";

/**
 * Janela deslizante em memória, com teto de chaves para não crescer sem limite.
 * Em ambientes serverless cada instância tem seu próprio contador: isso não
 * substitui um WAF, mas barra rajadas e força bruta vindas de um mesmo cliente.
 */
interface Bucket { hits: number[]; touchedAt: number; }

const MAX_KEYS = 5_000;
const buckets = new Map<string, Bucket>();

function evict(now: number, windowMs: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.touchedAt < now - windowMs) buckets.delete(key);
  }
  // Ainda cheio: descarta as chaves mais antigas (Map preserva ordem de inserção).
  const overflow = buckets.size - MAX_KEYS + Math.ceil(MAX_KEYS * 0.1);
  if (overflow > 0) {
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++removed >= overflow) break;
    }
  }
}

export interface RateLimitResult { allowed: boolean; remaining: number; retryAfterSeconds: number; }

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  evict(now, windowMs);
  const bucket = buckets.get(key) ?? { hits: [], touchedAt: now };
  bucket.hits = bucket.hits.filter((time) => time > now - windowMs);
  bucket.touchedAt = now;
  // Reinsere para manter a ordem de uso recente.
  buckets.delete(key);
  buckets.set(key, bucket);
  if (bucket.hits.length >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.hits[0] + windowMs - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  bucket.hits.push(now);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

export function resetRateLimits() { buckets.clear(); }
