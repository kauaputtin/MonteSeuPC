import { describe, expect, it } from "vitest";
import fixture from "@/tests/fixtures/external-products.json";
import { normalizeBrand, normalizeExternalProduct, normalizeMemoryType, normalizeModel, normalizeSocket, parseNumberWithUnit } from "@/integrations/core/normalizer";
import { createPublishableSpecifications } from "@/integrations/core/publishable-specifications";
import { canAutoMatch, rankProductMatches } from "@/integrations/core/product-matcher";
import { externalProductsSchema } from "@/integrations/schemas/external";
import { components } from "@/data/mock-data";
import { specificationsSchema } from "@/lib/validations/schemas";
import type { Component } from "@/types/domain";

const product = externalProductsSchema.parse(fixture)[0];

describe("normalização externa", () => {
  it("padroniza marcas, modelos, socket e DDR", () => {
    expect(normalizeBrand("Advanced Micro Devices")).toBe("AMD");
    expect(normalizeModel("CPU Ryzen 5 5600G")).toBe("RYZEN 5 5600G");
    expect(normalizeSocket("Socket AM 4")).toBe("AM4");
    expect(normalizeMemoryType("Memória DDR 5")).toBe("DDR5");
  });

  it("converte unidades sem inventar valores", () => {
    expect(parseNumberWithUnit("32 cm", "mm")).toBe(320);
    expect(parseNumberWithUnit("1 TB", "gb")).toBe(1000);
    expect(parseNumberWithUnit("3.9 GHz", "mhz")).toBe(3900);
    expect(parseNumberWithUnit(undefined, "watts")).toBeNull();
  });

  it("mantém campos ausentes como null sem impedir a verificação dos campos críticos", () => {
    const normalized = normalizeExternalProduct(product);
    expect(normalized.categorySlug).toBe("processador");
    expect(normalized.specifications.socket).toBe("AM4");
    expect(normalized.status).toBe("partial");
    expect(normalized.specifications.baseClockGhz).toBeNull();
  });

  it("mapeia os nomes de atributos usados pelo catálogo do Mercado Livre", () => {
    const normalized = normalizeExternalProduct({ ...product, category: "MLB-COMPUTER_PROCESSORS", specifications: { compatible_sockets: "1200", cpu_cores_number: "6", cpu_threads_number: "12", min_clock_frequency: "2.6 GHz", max_clock_frequency: "4.4 GHz", tdp: "65 W" } });
    expect(normalized.specifications).toMatchObject({ socket: "LGA1200", cores: 6, threads: 12, baseClockGhz: 2.6, turboClockGhz: 4.4, tdpWatts: 65 });
  });

  it("gera uma estrutura publicável sem declarar a ficha parcial como verificada", () => {
    const normalized = normalizeExternalProduct({ ...product, category: "MLB-COMPUTER_PROCESSORS", specifications: { compatible_sockets: "AM4", cpu_cores_number: "6", cpu_threads_number: "12", tdp: "65 W" } });
    const publishable = createPublishableSpecifications(normalized, product.title);
    expect(specificationsSchema.safeParse(publishable).success).toBe(true);
    expect(normalized.status).toBe("partial");
  });
});

describe("correspondência de produtos", () => {
  const base: Component = { ...components[0], id: "real-5600g", brand: "AMD", name: "Ryzen 5 5600G", model: "Ryzen 5 5600G", gtin: product.gtin, ean: product.ean, mpn: product.mpn, categorySlug: "processador", specifications: { kind: "processor", socket: "AM4", cores: 6, threads: 12, baseClockGhz: 3.9, turboClockGhz: 4.4, tdpWatts: 65, integratedGraphics: true, coolerIncluded: true } };

  it("associa automaticamente por GTIN/EAN e MPN confiável", () => {
    const best = rankProductMatches(product, normalizeExternalProduct(product), [base])[0];
    expect(best.confidence).toBeGreaterThan(0.95); expect(best.reliableIdentifier).toBe(true); expect(canAutoMatch(best)).toBe(true);
    const byMpn = { ...product, gtin: undefined, ean: undefined };
    expect(rankProductMatches(byMpn, normalizeExternalProduct(byMpn), [base])[0].confidence).toBe(0.98);
  });

  it("não une automaticamente apenas por título semelhante", () => {
    const titleOnly = { ...product, gtin: undefined, ean: undefined, mpn: undefined, model: undefined };
    const candidate = rankProductMatches(titleOnly, normalizeExternalProduct(titleOnly), [{ ...base, gtin: undefined, ean: undefined, mpn: undefined, model: undefined }])[0];
    expect(candidate.confidence).toBeLessThan(0.75); expect(canAutoMatch(candidate)).toBe(false);
  });

  it("bloqueia variações DDR/capacidade e modelos OC/Ti", () => {
    const memoryProduct = { ...product, title: "Memória DDR5 16 GB", category: "memoria ram", gtin: undefined, ean: undefined, mpn: "KIT-X", specifications: { tipo_de_memoria: "DDR5", capacidade: "16 GB", modules: 2 } };
    const memory: Component = { ...components.find((item) => item.categorySlug === "memoria-ram")!, id: "memory", brand: "AMD", mpn: "KIT-X", specifications: { kind: "memory", memoryType: "DDR4", capacityGb: 8, modules: 1, frequencyMhz: 3200, latency: "CL16", voltage: 1.35 } };
    expect(rankProductMatches(memoryProduct, normalizeExternalProduct(memoryProduct), [memory])[0].blockedByVariation).toBe(true);
    const oc = { ...product, title: "AMD Ryzen 5 5600G OC" };
    expect(rankProductMatches(oc, normalizeExternalProduct(oc), [base])[0].blockedByVariation).toBe(true);
  });
});
