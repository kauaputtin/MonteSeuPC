import "server-only";

import { getAdminAccess } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const attempts = new Map<string, number[]>();

export async function getAdminApiContext() {
  const access = await getAdminAccess();
  const supabase = createAdminSupabaseClient();
  return access.user && supabase ? { user: access.user, supabase } : null;
}

export function consumeAdminRateLimit(key: string, limit = 3, windowMs = 5 * 60_000) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((time) => time > now - windowMs);
  if (recent.length >= limit) return false;
  recent.push(now); attempts.set(key, recent); return true;
}

export async function auditAdminAction(context: NonNullable<Awaited<ReturnType<typeof getAdminApiContext>>>, action: string, resourceType: string, resourceId?: string, metadata: Record<string, unknown> = {}) {
  await context.supabase.from("admin_audit_log").insert({ user_id: context.user.id, action, resource_type: resourceType, resource_id: resourceId ?? null, metadata });
}
