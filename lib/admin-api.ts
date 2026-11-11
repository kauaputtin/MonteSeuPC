import "server-only";

import { getAdminAccess } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/rate-limit";

export async function getAdminApiContext() {
  const access = await getAdminAccess();
  const supabase = createAdminSupabaseClient();
  return access.user && supabase ? { user: access.user, supabase } : null;
}

export function consumeAdminRateLimit(key: string, limit = 3, windowMs = 5 * 60_000) {
  return rateLimit(`admin:${key}`, limit, windowMs).allowed;
}

export async function auditAdminAction(context: NonNullable<Awaited<ReturnType<typeof getAdminApiContext>>>, action: string, resourceType: string, resourceId?: string, metadata: Record<string, unknown> = {}) {
  await context.supabase.from("admin_audit_log").insert({ user_id: context.user.id, action, resource_type: resourceType, resource_id: resourceId ?? null, metadata });
}

/** Remove tokens e detalhes internos antes de devolver um erro ao painel. */
export function safeErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  return error.message.replace(/Bearer\s+\S+/gi, "Bearer [oculto]").replace(/(apikey|token|secret)[=/:]\s*\S+/gi, "$1=[oculto]").slice(0, 300);
}
