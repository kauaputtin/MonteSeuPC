import type { Offer } from "@/types/domain";

export type PaymentPreference = "pix" | "normal";

export function getEffectiveOfferPrice(offer: Offer, preference: PaymentPreference = "pix") {
  return preference === "pix" ? offer.pixPrice ?? offer.price : offer.price;
}

export function availableOffersForComponent(offers: Offer[], componentId: string, includeNonNew = false, preference: PaymentPreference = "pix") {
  return offers
    .filter((offer) => offer.componentId === componentId && offer.available && !offer.staleAt && (includeNonNew || !offer.condition || offer.condition === "new"))
    .sort((left, right) => getEffectiveOfferPrice(left, preference) - getEffectiveOfferPrice(right, preference));
}

export function preferredPurchaseUrl(offer: Offer) {
  return offer.affiliateStatus === "active" && offer.affiliateUrl ? offer.affiliateUrl : offer.originalUrl ?? offer.productUrl;
}
