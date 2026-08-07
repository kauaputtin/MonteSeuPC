import { components, offers, stores } from "@/data/mock-data";
import { AdminResourceManager, type AdminRow } from "@/features/admin/admin-resource-manager";
import { requireAdmin } from "@/lib/supabase/auth";

export default async function OffersAdminPage() {
  const { demoMode } = await requireAdmin();
  const rows: AdminRow[] = offers.map((item) => ({ id: item.id, title: `${components.find((component) => component.id === item.componentId)?.name ?? "Componente"} · ${stores.find((store) => store.id === item.storeId)?.name ?? "Loja"}`, subtitle: item.productUrl, value: item.pixPrice ?? item.price, active: item.available, updatedAt: item.lastCheckedAt, raw: { ...item, component_id: item.componentId, store_id: item.storeId, pix_price: item.pixPrice, product_url: item.productUrl, last_checked_at: item.lastCheckedAt } }));
  return <><p className="heading-label">Preços</p><h1 className="mt-2 text-3xl font-black">Ofertas</h1><p className="mb-6 mt-2 text-slate-400">Atualize preços, links e disponibilidade sem coleta automática.</p><AdminResourceManager resource="ofertas" initialRows={rows} demoMode={demoMode} /></>;
}
