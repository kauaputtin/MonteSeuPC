import { afterEach, describe, expect, it, vi } from "vitest";
import { MercadoLivreProvider } from "@/integrations/providers/mercado-livre/provider";
import { catalogSearchSchema } from "@/integrations/providers/mercado-livre/schemas";

function json(value: unknown) { return new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } }); }

afterEach(() => vi.restoreAllMocks());

describe("MercadoLivreProvider", () => {
  it("valida busca, atributos e ofertas da API oficial em um fluxo completo", async () => {
    vi.stubGlobal("fetch", vi.fn((input: URL | RequestInfo) => {
      const url = new URL(String(input));
      if (url.pathname === "/products/search") return Promise.resolve(json({ paging: { total: 1, limit: 10, offset: 0 }, results: [{ id: "MLB-CATALOG-1", name: "AMD Ryzen 5 5600G", domain_id: "MLB-COMPUTER_PROCESSORS", attributes: [{ id: "BRAND", value_name: "AMD" }, { id: "MODEL", value_name: "Ryzen 5 5600G" }, { id: "GTIN", value_name: "730143313414" }, { id: "PART_NUMBER", value_name: "100-100000252BOX" }, { id: "SOCKET", name: "Socket", value_name: "Socket AM4" }], pictures: [{ secure_url: "https://http2.mlstatic.com/D_1.jpg" }] }] }));
      if (url.pathname === "/products/MLB-CATALOG-1/items") return Promise.resolve(json({ paging: { total: 1, limit: 50, offset: 0 }, results: [{ item_id: "MLB123", price: 899.9, currency_id: "BRL", condition: "new" }] }));
      if (url.pathname === "/items") return Promise.resolve(json([{ code: 200, body: { id: "MLB123", title: "AMD Ryzen 5 5600G", price: 899.9, original_price: 999.9, currency_id: "BRL", available_quantity: 4, status: "active", condition: "new", seller_id: 77, permalink: "https://produto.mercadolivre.com.br/MLB123", attributes: [], last_updated: "2026-08-07T12:00:00.000Z" } }]));
      throw new Error(`URL inesperada: ${url.pathname}`);
    }));
    const provider = new MercadoLivreProvider(async () => "token-de-teste-com-tamanho-valido");
    const products = await provider.searchProducts({ query: "Ryzen 5600G", limit: 10 });
    expect(products).toHaveLength(1); expect(products[0].gtin).toBe("730143313414"); expect(products[0].offers[0]).toMatchObject({ externalId: "MLB123", price: 899.9, available: true, condition: "new" });
  });

  it("rejeita formatos externos inesperados", () => {
    expect(() => catalogSearchSchema.parse({ paging: {}, results: [{ id: 1 }] })).toThrow();
  });
});
