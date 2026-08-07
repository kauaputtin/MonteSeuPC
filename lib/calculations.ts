import { offers as demoOffers } from "@/data/mock-data";
import { availableOffersForComponent, getEffectiveOfferPrice, type PaymentPreference } from "@/lib/offers";
import type { Offer, SelectedComponents, SelectedOffers } from "@/types/domain";

export function calculateBuildTotal(components: SelectedComponents, selectedOffers: SelectedOffers, availableOffers: Offer[] = demoOffers, preference: PaymentPreference = "pix") {
  return Object.entries(components).reduce((total, [category, component]) => {
    if (!component) return total;
    const selected = selectedOffers[category as keyof SelectedOffers];
    const reference = selected?.available && !selected.staleAt ? selected : availableOffersForComponent(availableOffers, component.id, false, preference)[0];
    return total + (reference ? getEffectiveOfferPrice(reference, preference) : 0);
  }, 0);
}
