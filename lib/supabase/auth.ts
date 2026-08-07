import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "./config";

export async function createAuthenticatedSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server Component sem permissão de escrita. */ }
      }
    }
  });
}

export async function getAdminAccess() {
  if (!isSupabaseConfigured()) return { demoMode: true, user: null };
  const supabase = await createAuthenticatedSupabaseClient();
  if (!supabase) return { demoMode: true, user: null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { demoMode: false, user: null };
  const { data: profile } = await supabase.from("admin_profiles").select("role").eq("user_id", user.id).in("role", ["admin", "editor"]).maybeSingle();
  return { demoMode: false, user: profile ? user : null };
}

export async function requireAdmin() {
  const access = await getAdminAccess();
  if (!access.demoMode && !access.user) redirect("/admin/login");
  return access;
}

export async function verifyAdminRequest() {
  const access = await getAdminAccess();
  return Boolean(!access.demoMode && access.user);
}
