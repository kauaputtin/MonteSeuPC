import { components } from "@/data/mock-data";
import { AdminResourceManager, type AdminRow } from "@/features/admin/admin-resource-manager";
import { requireAdmin } from "@/lib/supabase/auth";

export default async function ComponentsAdminPage() {
  const { demoMode } = await requireAdmin();
  const rows: AdminRow[] = components.map((item) => ({ id: item.id, title: item.name, subtitle: item.brand, active: item.active, updatedAt: "2026-01-15T14:00:00.000Z", raw: { ...item, category_slug: item.categorySlug, image_url: item.imageUrl, estimated_watts: item.estimatedWatts } }));
  return <><p className="heading-label">Catálogo</p><h1 className="mt-2 text-3xl font-black">Componentes</h1><p className="mb-6 mt-2 text-slate-400">Cadastre especificações por categoria e controle a disponibilidade.</p><AdminResourceManager resource="componentes" initialRows={rows} demoMode={demoMode} /></>;
}
