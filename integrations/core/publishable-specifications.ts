import type { NormalizationResult } from "@/integrations/types/external";
import type { ComponentSpecifications } from "@/types/domain";

function positive(value: unknown, fallback = 1) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonnegative(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function integer(value: unknown, fallback = 1) { return Math.max(1, Math.round(positive(value, fallback))); }
function text(value: unknown, fallback = "Não informado") { return typeof value === "string" && value.trim().length >= 2 ? value.trim() : fallback; }
function boolean(value: unknown) { return typeof value === "boolean" ? value : false; }
function strings(value: unknown, fallback = ["Não informado"]) {
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === "string" && item.trim().length >= 2);
    if (items.length) return items;
  }
  if (typeof value === "string") {
    const items = value.split(/[,;/]/).map((item) => item.trim()).filter((item) => item.length >= 2);
    if (items.length) return items;
  }
  return fallback;
}

export function createPublishableSpecifications(normalized: NormalizationResult, title: string): ComponentSpecifications | null {
  const value = normalized.specifications;
  switch (normalized.categorySlug) {
    case "processador": return {
      kind: "processor", socket: text(value.socket), cores: integer(value.cores), threads: integer(value.threads),
      baseClockGhz: positive(value.baseClockGhz), turboClockGhz: positive(value.turboClockGhz), tdpWatts: positive(value.tdpWatts),
      integratedGraphics: boolean(value.integratedGraphics), coolerIncluded: boolean(value.coolerIncluded)
    };
    case "placa-mae": return {
      kind: "motherboard", socket: text(value.socket), chipset: text(value.chipset),
      formFactor: value.formFactor === "Micro-ATX" || value.formFactor === "Mini-ITX" ? value.formFactor : "ATX",
      memoryType: value.memoryType === "DDR5" ? "DDR5" : "DDR4", memorySlots: integer(value.memorySlots), maxMemoryGb: integer(value.maxMemoryGb),
      m2Slots: Math.round(nonnegative(value.m2Slots)), sataPorts: Math.round(nonnegative(value.sataPorts)), pcieVersion: positive(value.pcieVersion),
      wifi: boolean(value.wifi), storageInterfaces: strings(value.storageInterfaces)
    };
    case "memoria-ram": return {
      kind: "memory", memoryType: value.memoryType === "DDR5" ? "DDR5" : "DDR4", capacityGb: integer(value.capacityGb),
      modules: integer(value.modules), frequencyMhz: integer(value.frequencyMhz), latency: text(value.latency), voltage: positive(value.voltage)
    };
    case "placa-de-video": return {
      kind: "gpu", chipMaker: text(value.chipMaker), vramGb: integer(value.vramGb), lengthMm: positive(value.lengthMm), slots: positive(value.slots),
      powerWatts: positive(value.powerWatts), recommendedPsuWatts: positive(value.recommendedPsuWatts), powerConnectors: strings(value.powerConnectors)
    };
    case "armazenamento": {
      const storageType = value.storageType === "HDD" || value.storageType === "SSD SATA" || value.storageType === "SSD NVMe"
        ? value.storageType : /nvme/i.test(title) ? "SSD NVMe" : /\bhdd\b|disco r[ií]gido/i.test(title) ? "HDD" : "SSD SATA";
      return { kind: "storage", storageType, capacityGb: integer(value.capacityGb), interface: text(value.interface), formFactor: text(value.formFactor), readSpeedMbps: positive(value.readSpeedMbps), writeSpeedMbps: positive(value.writeSpeedMbps) };
    }
    case "fonte": return {
      kind: "psu", wattage: positive(value.wattage), certification: text(value.certification), formFactor: value.formFactor === "SFX" ? "SFX" : "ATX",
      modularity: value.modularity === "Modular" || value.modularity === "Semi-modular" ? value.modularity : "Não modular",
      pcieConnectors: strings(value.pcieConnectors, []), has12Vhpwr: boolean(value.has12Vhpwr), activePfc: boolean(value.activePfc)
    };
    case "gabinete": return {
      kind: "case", motherboardFormFactors: strings(value.motherboardFormFactors, ["ATX"]).filter((item): item is "ATX" | "Micro-ATX" | "Mini-ITX" => item === "ATX" || item === "Micro-ATX" || item === "Mini-ITX"),
      maxGpuLengthMm: positive(value.maxGpuLengthMm), maxCoolerHeightMm: positive(value.maxCoolerHeightMm), maxRadiatorMm: positive(value.maxRadiatorMm),
      psuFormFactors: strings(value.psuFormFactors, ["ATX"]).filter((item): item is "ATX" | "SFX" => item === "ATX" || item === "SFX"), fanSlots: integer(value.fanSlots)
    };
    case "cooler": return {
      kind: "cooler", coolerType: value.coolerType === "Water cooler" || /water|l[ií]quid/i.test(title) ? "Water cooler" : "Air cooler",
      supportedSockets: strings(value.supportedSockets), heightMm: value.heightMm == null ? undefined : positive(value.heightMm),
      radiatorMm: value.radiatorMm == null ? undefined : positive(value.radiatorMm), supportedTdpWatts: positive(value.supportedTdpWatts)
    };
    default: return null;
  }
}
