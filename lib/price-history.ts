import "server-only";

import { createPublicSupabaseClient } from "@/lib/supabase/server";

export interface PricePoint { offerId: string; price: number; pixPrice?: number; available: boolean; capturedAt: string; }

export async function getComponentPriceHistory(offerIds: string[]): Promise<PricePoint[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase || !offerIds.length) return [];
  const { data, error } = await supabase.from("price_history").select("offer_id,price,pix_price,available,captured_at").in("offer_id", offerIds).order("captured_at", { ascending: true }).limit(500);
  if (error) return [];
  return (data ?? []).map((row) => ({ offerId: String(row.offer_id), price: Number(row.price), pixPrice: row.pix_price == null ? undefined : Number(row.pix_price), available: Boolean(row.available), capturedAt: String(row.captured_at) }));
}
