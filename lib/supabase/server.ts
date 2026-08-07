import { createClient } from "@supabase/supabase-js";
import { canWriteSupabaseServerSide, isSupabaseConfigured } from "./config";

export function createPublicSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function createAdminSupabaseClient() {
  if (!canWriteSupabaseServerSide()) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
