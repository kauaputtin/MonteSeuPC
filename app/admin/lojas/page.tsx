import { stores } from "@/data/mock-data";
import { AdminResourceManager, type AdminRow } from "@/features/admin/admin-resource-manager";
import { requireAdmin } from "@/lib/supabase/auth";

export default async function StoresAdminPage() {
  const { demoMode } = await requireAdmin();
  const rows: AdminRow[] = stores.map((item) => ({ id: item.id, title: item.name, subtitle: item.websiteUrl, active: item.active, updatedAt: "2026-01-15T14:00:00.000Z", raw: { ...item, website_url: item.websiteUrl, logo_url: item.logoUrl } }));
  return <><p className="heading-label">Parceiros</p><h1 className="mt-2 text-3xl font-black">Lojas</h1><p className="mb-6 mt-2 text-slate-400">Mantenha os dados das lojas utilizadas nas ofertas.</p><AdminResourceManager resource="lojas" initialRows={rows} demoMode={demoMode} /></>;
}
