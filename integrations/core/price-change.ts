export interface PriceSnapshot { price: number; pixPrice?: number | null; originalPrice?: number | null; shippingPrice?: number | null; available: boolean; }

export function shouldCapturePriceChange(previous: PriceSnapshot | null, current: PriceSnapshot) {
  return !previous || previous.price !== current.price || (previous.pixPrice ?? null) !== (current.pixPrice ?? null) || (previous.originalPrice ?? null) !== (current.originalPrice ?? null) || (previous.shippingPrice ?? null) !== (current.shippingPrice ?? null) || previous.available !== current.available;
}
