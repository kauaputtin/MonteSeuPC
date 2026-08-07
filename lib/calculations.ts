import { getEffectivePrice, getOffersForComponent } from "@/data/mock-data";
import type { SelectedComponents, SelectedOffers } from "@/types/domain";

export function calculateBuildTotal(components: SelectedComponents, selectedOffers: SelectedOffers) {
  return Object.entries(components).reduce((total, [category, component]) => {
    if (!component) return total;
    const selected = selectedOffers[category as keyof SelectedOffers];
    const reference = selected ?? getOffersForComponent(component.id)[0];
    return total + (reference ? getEffectivePrice(reference) : 0);
  }, 0);
}
