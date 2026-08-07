import { describe, expect, it } from "vitest";
import { components, getEffectivePrice, getOffersForComponent } from "@/data/mock-data";
import { calculateBuildTotal } from "@/lib/calculations";
import { calculateEstimatedWatts, calculateRawWatts, calculateRecommendedPsuWatts, evaluateBuild } from "@/lib/compatibility/compatibility-engine";
import type { SelectedComponents } from "@/types/domain";

function byId(id: string) {
  const item = components.find((component) => component.id === id);
  if (!item) throw new Error(`Fixture ausente: ${id}`);
  return item;
}

function selected(...ids: string[]): SelectedComponents {
  return Object.fromEntries(ids.map((id) => { const item = byId(id); return [item.categorySlug, item]; })) as SelectedComponents;
}

function check(build: SelectedComponents, code: string) {
  const result = evaluateBuild(build).find((item) => item.code === code);
  if (!result) throw new Error(`Verificação ausente: ${code}`);
  return result;
}

describe("compatibility-engine", () => {
  it("aceita sockets iguais e rejeita sockets diferentes", () => {
    expect(check(selected("cpu-am5-6", "mb-am5-ddr5-atx"), "cpu-motherboard-socket").status).toBe("compatible");
    expect(check(selected("cpu-am5-6", "mb-lga-ddr4-atx"), "cpu-motherboard-socket").status).toBe("incompatible");
  });

  it("distingue memórias DDR4 e DDR5", () => {
    expect(check(selected("mb-am5-ddr5-atx", "ram-ddr5-32"), "memory-type").status).toBe("compatible");
    expect(check(selected("mb-am5-ddr5-atx", "ram-ddr4-16"), "memory-type").status).toBe("incompatible");
  });

  it("valida o formato da placa-mãe no gabinete", () => {
    expect(check(selected("mb-am5-ddr5-atx", "case-atx-330"), "motherboard-case-format").status).toBe("compatible");
    expect(check(selected("mb-am5-ddr5-atx", "case-itx-240"), "motherboard-case-format").status).toBe("incompatible");
  });

  it("valida o comprimento da placa de vídeo", () => {
    expect(check(selected("gpu-180", "case-atx-330"), "gpu-length").status).toBe("compatible");
    expect(check(selected("gpu-355", "case-atx-330"), "gpu-length").status).toBe("incompatible");
  });

  it("valida socket, altura e radiador do cooler", () => {
    expect(check(selected("cpu-lga1700-6", "cooler-air-170"), "cooler-socket").status).toBe("incompatible");
    expect(check(selected("cooler-air-170", "case-atx-330"), "air-cooler-height").status).toBe("incompatible");
    expect(check(selected("cooler-water-360", "case-matx-280"), "radiator-size").status).toBe("incompatible");
  });

  it("rejeita fonte abaixo da potência recomendada", () => {
    const build = selected("cpu-am5-8", "mb-am5-ddr5-atx", "ram-ddr5-32", "gpu-355", "ssd-nvme-2", "psu-500", "case-atx-400", "cooler-water-240");
    expect(check(build, "psu-wattage").status).toBe("incompatible");
  });

  it("aceita fonte com quantidade superior de conectores PCIe", () => {
    const build = selected("gpu-180", "psu-650");
    expect(check(build, "gpu-power-connectors").status).toBe("compatible");
  });

  it("calcula consumo e recomenda faixa comercial com margem", () => {
    const build = selected("cpu-am5-6", "mb-am5-ddr5-atx", "ram-ddr5-32", "gpu-180", "ssd-nvme-1", "case-atx-330", "cooler-air-150");
    expect(calculateRawWatts(build)).toBe(322);
    expect(calculateEstimatedWatts(build)).toBe(Math.ceil(322 * 1.1));
    expect(calculateRecommendedPsuWatts(build)).toBe(450);
  });

  it("calcula o total usando ofertas selecionadas", () => {
    const cpu = byId("cpu-am5-6");
    const ram = byId("ram-ddr5-32");
    const cpuOffer = getOffersForComponent(cpu.id)[1];
    const ramOffer = getOffersForComponent(ram.id)[1];
    const total = calculateBuildTotal({ processador: cpu, "memoria-ram": ram }, { processador: cpuOffer, "memoria-ram": ramOffer });
    expect(total).toBe(getEffectivePrice(cpuOffer) + getEffectivePrice(ramOffer));
  });

  it("detecta quando a troca do processador invalida a placa-mãe", () => {
    const before = selected("cpu-am5-6", "mb-am5-ddr5-atx");
    expect(check(before, "cpu-motherboard-socket").status).toBe("compatible");
    const after = { ...before, processador: byId("cpu-lga1700-6") };
    expect(check(after, "cpu-motherboard-socket").status).toBe("incompatible");
  });

  it("ordena e escolhe a oferta mais barata como referência", () => {
    const cpu = byId("cpu-am5-6");
    const productOffers = getOffersForComponent(cpu.id);
    expect(getEffectivePrice(productOffers[0])).toBeLessThanOrEqual(getEffectivePrice(productOffers[1]));
    expect(calculateBuildTotal({ processador: cpu }, {})).toBe(getEffectivePrice(productOffers[0]));
  });
});
