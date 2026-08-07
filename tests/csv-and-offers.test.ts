import { describe, expect, it } from "vitest";
import { csvExample, parseCsvProducts } from "@/integrations/providers/csv/csv-parser";
import { availableOffersForComponent, getEffectiveOfferPrice } from "@/lib/offers";
import { shouldCapturePriceChange } from "@/integrations/core/price-change";
import { advanceOfferStaleness } from "@/integrations/core/staleness";
import type { Offer } from "@/types/domain";

function offer(overrides: Partial<Offer>): Offer { return { id: "o", componentId: "c", storeId: "s", price: 100, productUrl: "https://store.example/p", affiliate: false, available: true, lastCheckedAt: new Date().toISOString(), condition: "new", ...overrides }; }

describe("CSV autorizado", () => {
  it("importa o modelo com JSON entre aspas", () => {
    const parsed = parseCsvProducts(csvExample); expect(parsed.errors).toEqual([]); expect(parsed.products).toHaveLength(1);
    expect(parsed.products[0].offers[0].pixPrice).toBe(849.9); expect(parsed.products[0].specifications.socket).toBe("AM4");
  });

  it("mapeia colunas e informa erros por linha", () => {
    const csv = "loja;sku;nome;valor;url\nMinha Loja;1;Produto real;abc;https://store.example/p";
    const parsed = parseCsvProducts(csv, { store: "loja", external_id: "sku", title: "nome", price: "valor", product_url: "url" });
    expect(parsed.products).toHaveLength(0); expect(parsed.errors[0].line).toBe(2);
  });
});

describe("ofertas e histórico", () => {
  it("ignora indisponíveis, desatualizadas e usadas por padrão", () => {
    const offers = [offer({ id: "normal", price: 120 }), offer({ id: "pix", price: 130, pixPrice: 90 }), offer({ id: "off", price: 1, available: false }), offer({ id: "stale", price: 2, staleAt: new Date().toISOString() }), offer({ id: "used", price: 3, condition: "used" })];
    expect(availableOffersForComponent(offers, "c").map((item) => item.id)).toEqual(["pix", "normal"]);
    expect(getEffectiveOfferPrice(offers[0], "normal")).toBe(120);
  });

  it("só cria histórico quando preço, frete ou disponibilidade muda", () => {
    const snapshot = { price: 100, pixPrice: 90, originalPrice: null, shippingPrice: null, available: true };
    expect(shouldCapturePriceChange(null, snapshot)).toBe(true); expect(shouldCapturePriceChange(snapshot, { ...snapshot })).toBe(false);
    expect(shouldCapturePriceChange(snapshot, { ...snapshot, price: 101 })).toBe(true); expect(shouldCapturePriceChange(snapshot, { ...snapshot, available: false })).toBe(true);
  });

  it("marca uma oferta como desatualizada somente após três falhas", () => {
    expect(advanceOfferStaleness(0).staleAt).toBeNull(); expect(advanceOfferStaleness(1).staleAt).toBeNull();
    expect(advanceOfferStaleness(2, new Date("2026-08-07T12:00:00Z"))).toEqual({ consecutiveFailures: 3, staleAt: "2026-08-07T12:00:00.000Z" });
  });
});
