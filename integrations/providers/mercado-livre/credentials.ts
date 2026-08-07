import "server-only";

import { z } from "zod";
import { safeFetchJson } from "@/integrations/core/safe-fetch";
import { decryptIntegrationPayload, encryptIntegrationPayload } from "@/lib/integration-crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const tokenSchema = z.object({ access_token: z.string().min(10), token_type: z.string().optional(), expires_in: z.number().int().positive(), scope: z.string().optional(), user_id: z.number().optional(), refresh_token: z.string().min(10).optional() });
type TokenResponse = z.infer<typeof tokenSchema>;
interface StoredCredential { accessToken: string; refreshToken?: string; expiresAt: string; }

function appCredentials() {
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID?.trim();
  const clientSecret = process.env.MERCADO_LIVRE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Configure MERCADO_LIVRE_CLIENT_ID e MERCADO_LIVRE_CLIENT_SECRET.");
  return { clientId, clientSecret };
}

async function requestToken(parameters: Record<string, string>) {
  const result = await safeFetchJson("https://api.mercadolibre.com/oauth/token", {
    allowedHosts: ["api.mercadolibre.com"], method: "POST", timeoutMs: 8_000, maxResponseBytes: 100_000,
    headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(parameters).toString(), attempts: 1
  });
  return tokenSchema.parse(result);
}

export async function saveMercadoLivreCredentials(token: TokenResponse) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new Error("Supabase service role não configurada.");
  const expiresAt = new Date(Date.now() + Math.max(60, token.expires_in - 30) * 1_000).toISOString();
  const payload: StoredCredential = { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt };
  const { error } = await supabase.from("integration_credentials").upsert({ provider_id: "mercado-livre", encrypted_payload: encryptIntegrationPayload(payload), expires_at: expiresAt }, { onConflict: "provider_id" });
  if (error) throw new Error("Não foi possível guardar a credencial OAuth.");
  await supabase.from("integration_providers").update({ enabled: true, configuration_status: "configured", last_error: null }).eq("id", "mercado-livre");
}

export async function exchangeMercadoLivreCode(code: string, callbackUri?: string) {
  const app = appCredentials();
  const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI?.trim() || callbackUri?.trim();
  if (!redirectUri) throw new Error("Não foi possível determinar a redirect URI do Mercado Livre.");
  const token = await requestToken({ grant_type: "authorization_code", client_id: app.clientId, client_secret: app.clientSecret, code, redirect_uri: redirectUri });
  await saveMercadoLivreCredentials(token);
}

export async function loadMercadoLivreAccessToken() {
  const environmentToken = process.env.MERCADO_LIVRE_ACCESS_TOKEN?.trim();
  if (environmentToken) return environmentToken;
  const supabase = createAdminSupabaseClient();
  if (!supabase || !process.env.INTEGRATION_ENCRYPTION_KEY) return null;
  const { data } = await supabase.from("integration_credentials").select("encrypted_payload").eq("provider_id", "mercado-livre").maybeSingle();
  if (!data?.encrypted_payload) return null;
  const stored = decryptIntegrationPayload<StoredCredential>(String(data.encrypted_payload));
  if (Date.parse(stored.expiresAt) > Date.now() + 120_000) return stored.accessToken;
  if (!stored.refreshToken) return null;
  const app = appCredentials();
  const refreshed = await requestToken({ grant_type: "refresh_token", client_id: app.clientId, client_secret: app.clientSecret, refresh_token: stored.refreshToken });
  if (!refreshed.refresh_token) refreshed.refresh_token = stored.refreshToken;
  await saveMercadoLivreCredentials(refreshed);
  return refreshed.access_token;
}
