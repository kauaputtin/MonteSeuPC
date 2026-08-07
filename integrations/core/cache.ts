import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export class IntegrationCache {
  constructor(private readonly supabase: SupabaseClient, private readonly providerId: string, private readonly maximumTtlSeconds: number) {
    if (maximumTtlSeconds <= 0) throw new Error("TTL máximo inválido.");
  }

  async get<T>(cacheKey: string): Promise<T | null> {
    const { data } = await this.supabase.from("integration_cache").select("payload,expires_at").eq("provider_id", this.providerId).eq("cache_key", cacheKey).gt("expires_at", new Date().toISOString()).maybeSingle();
    return data ? data.payload as T : null;
  }

  async set(cacheKey: string, payload: unknown, ttlSeconds: number) {
    const effectiveTtl = Math.max(1, Math.min(ttlSeconds, this.maximumTtlSeconds));
    const expiresAt = new Date(Date.now() + effectiveTtl * 1_000).toISOString();
    const { error } = await this.supabase.from("integration_cache").upsert({ provider_id: this.providerId, cache_key: cacheKey, payload, expires_at: expiresAt }, { onConflict: "provider_id,cache_key" });
    if (error) throw new Error("Falha ao persistir cache da integração.");
  }

  async invalidate() { await this.supabase.from("integration_cache").delete().eq("provider_id", this.providerId); }
}
