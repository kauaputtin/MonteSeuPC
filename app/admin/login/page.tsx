import { redirect } from "next/navigation";
import { AdminLogin } from "@/features/admin/admin-login";
import { getAdminAccess } from "@/lib/supabase/auth";

export default async function LoginPage() {
  const access = await getAdminAccess();
  if (access.demoMode || access.user) redirect("/admin");
  return <AdminLogin />;
}
