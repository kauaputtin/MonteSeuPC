import type { CategorySlug } from "@/types/domain";
import type { ExternalProduct, NormalizationResult } from "@/integrations/types/external";

const brandAliases: Record<string, string> = {
  "advanced micro devices": "AMD", amd: "AMD", intel: "Intel", nvidia: "NVIDIA",
  "asustek": "ASUS", asus: "ASUS", "micro-star international": "MSI", msi: "MSI",
  gigabyte: "Gigabyte", corsair: "Corsair", kingston: "Kingston", crucial: "Crucial",
  samsung: "Samsung", western_digital: "Western Digital", "western digital": "Western Digital",
  cooler_master: "Cooler Master", "cooler master": "Cooler Master"
};

export function normalizeComparableText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function normalizeBrand(value?: string | null) {
  if (!value?.trim()) return null;
  const key = normalizeComparableText(value).replaceAll(" ", "_");
  return brandAliases[key] ?? brandAliases[normalizeComparableText(value)] ?? value.trim().replace(/\s+/g, " ");
}

export function normalizeModel(value?: string | null) {
  if (!value?.trim()) return null;
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\b(PROCESSADOR|CPU|PLACA DE VIDEO|GPU|MEMORIA|SSD|FONTE)\b/gi, " ").replace(/\s+/g, " ").trim();
}

export function normalizeSocket(value?: string | null) {
  if (!value) return null;
  const normalized = value.toUpperCase().replace(/\bSOCKET\b/g, "").replace(/\s+/g, "");
  const match = /(?:AM[345]|LGA\d{3,4}|TRX40|STRX4)/.exec(normalized);
  return match?.[0] ?? null;
}

export function normalizeMemoryType(value?: string | null) {
  if (!value) return null;
  return /DDR\s*5/i.test(value) ? "DDR5" : /DDR\s*4/i.test(value) ? "DDR4" : null;
}

export function parseNumberWithUnit(value: unknown, target: "mm" | "gb" | "watts" | "mhz" | "ghz") {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().replace(",", ".");
  const numeric = Number.parseFloat(normalized.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return null;
  if (target === "mm" && /\bcm\b/.test(normalized)) return numeric * 10;
  if (target === "gb" && /\btb\b/.test(normalized)) return numeric * 1000;
  if (target === "mhz" && /\bghz\b/.test(normalized)) return numeric * 1000;
  if (target === "ghz" && /\bmhz\b/.test(normalized)) return numeric / 1000;
  return numeric;
}

function normalizedRecord(source: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [normalizeComparableText(key).replaceAll(" ", "_"), value]));
}

function first(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) if (source[key] !== undefined && source[key] !== null && source[key] !== "") return source[key];
  return null;
}

function text(value: unknown) { return typeof value === "string" ? value : value === null || value === undefined ? null : String(value); }
function integer(value: unknown) { const number = parseNumberWithUnit(value, "gb"); return number === null ? null : Math.round(number); }
function bool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  if (/^(sim|yes|true|possui|com)$/i.test(value.trim())) return true;
  if (/^(nao|não|no|false|sem)$/i.test(value.trim())) return false;
  return null;
}

export function detectCategory(product: Pick<ExternalProduct, "category" | "title">): CategorySlug | null {
  const value = normalizeComparableText(`${product.category ?? ""} ${product.title}`);
  if (/motherboard|placa mae/.test(value)) return "placa-mae";
  if (/processor|processador|\bcpu\b/.test(value)) return "processador";
  if (/ram|memoria/.test(value)) return "memoria-ram";
  if (/video card|graphics card|placa de video|\bgpu\b|geforce|radeon/.test(value)) return "placa-de-video";
  if (/ssd|nvme|hard drive|disco rigido|armazenamento|\bhdd\b/.test(value)) return "armazenamento";
  if (/power suppl|fonte/.test(value)) return "fonte";
  if (/computer case|gabinete/.test(value)) return "gabinete";
  if (/cpu cooler|water cooler|air cooler|cooler/.test(value)) return "cooler";
  return null;
}

const criticalFields: Record<CategorySlug, string[]> = {
  processador: ["socket", "cores", "threads", "tdpWatts"],
  "placa-mae": ["socket", "formFactor", "memoryType", "memorySlots", "maxMemoryGb"],
  "memoria-ram": ["memoryType", "capacityGb", "modules", "frequencyMhz"],
  "placa-de-video": ["vramGb", "lengthMm", "powerWatts", "powerConnectors"],
  armazenamento: ["storageType", "capacityGb", "interface", "formFactor"],
  fonte: ["wattage", "formFactor", "pcieConnectors"],
  gabinete: ["motherboardFormFactors", "maxGpuLengthMm", "maxCoolerHeightMm", "psuFormFactors"],
  cooler: ["coolerType", "supportedSockets", "supportedTdpWatts"]
};

export function normalizeExternalProduct(product: ExternalProduct): NormalizationResult {
  const source = normalizedRecord(product.specifications);
  const categorySlug = detectCategory(product);
  const brand = normalizeBrand(product.brand ?? text(first(source, "brand", "marca")));
  const model = normalizeModel(product.model ?? text(first(source, "model", "modelo", "part_number", "mpn")));
  if (!categorySlug) return { categorySlug: null, brand, model, specifications: {}, verifiedFields: [], missingCriticalFields: [], status: "unverified" };
  let specifications: Record<string, unknown>;
  switch (categorySlug) {
    case "processador": specifications = {
      kind: "processor", socket: normalizeSocket(text(first(source, "socket", "socket_do_processador"))),
      cores: integer(first(source, "cores", "nucleos", "quantidade_de_nucleos")), threads: integer(first(source, "threads", "quantidade_de_threads")),
      baseClockGhz: parseNumberWithUnit(first(source, "base_clock", "frequencia_base"), "ghz"), turboClockGhz: parseNumberWithUnit(first(source, "turbo_clock", "frequencia_maxima"), "ghz"),
      tdpWatts: parseNumberWithUnit(first(source, "tdp", "potencia_de_design_termico"), "watts"), integratedGraphics: bool(first(source, "integrated_graphics", "graficos_integrados")),
      coolerIncluded: bool(first(source, "cooler_included", "inclui_cooler"))
    }; break;
    case "placa-mae": specifications = {
      kind: "motherboard", socket: normalizeSocket(text(first(source, "socket"))), chipset: text(first(source, "chipset")), formFactor: text(first(source, "form_factor", "formato")),
      memoryType: normalizeMemoryType(text(first(source, "memory_type", "tipo_de_memoria"))), memorySlots: integer(first(source, "memory_slots", "slots_de_memoria")),
      maxMemoryGb: parseNumberWithUnit(first(source, "max_memory", "capacidade_maxima_de_memoria"), "gb"), m2Slots: integer(first(source, "m2_slots", "slots_m_2")),
      sataPorts: integer(first(source, "sata_ports", "portas_sata")), pcieVersion: parseNumberWithUnit(first(source, "pcie_version", "versao_pcie"), "gb"),
      wifi: bool(first(source, "wifi", "com_wifi")), storageInterfaces: first(source, "storage_interfaces", "interfaces_de_armazenamento") ?? null
    }; break;
    case "memoria-ram": specifications = {
      kind: "memory", memoryType: normalizeMemoryType(text(first(source, "memory_type", "tipo_de_memoria", "tecnologia_da_memoria"))),
      capacityGb: parseNumberWithUnit(first(source, "capacity", "capacidade_total", "capacidade"), "gb"), modules: integer(first(source, "modules", "quantidade_de_modulos")),
      frequencyMhz: parseNumberWithUnit(first(source, "frequency", "frequencia"), "mhz"), latency: text(first(source, "latency", "latencia")), voltage: parseNumberWithUnit(first(source, "voltage", "tensao"), "gb")
    }; break;
    case "placa-de-video": specifications = {
      kind: "gpu", chipMaker: text(first(source, "chip_maker", "fabricante_do_chip")), vramGb: parseNumberWithUnit(first(source, "vram", "memoria_de_video"), "gb"),
      lengthMm: parseNumberWithUnit(first(source, "length", "comprimento"), "mm"), slots: parseNumberWithUnit(first(source, "slots", "slots_ocupados"), "gb"),
      powerWatts: parseNumberWithUnit(first(source, "power", "consumo"), "watts"), recommendedPsuWatts: parseNumberWithUnit(first(source, "recommended_psu", "fonte_recomendada"), "watts"),
      powerConnectors: first(source, "power_connectors", "conectores_de_energia") ?? null
    }; break;
    case "armazenamento": specifications = {
      kind: "storage", storageType: text(first(source, "storage_type", "tipo")), capacityGb: parseNumberWithUnit(first(source, "capacity", "capacidade"), "gb"),
      interface: text(first(source, "interface")), formFactor: text(first(source, "form_factor", "formato")), readSpeedMbps: parseNumberWithUnit(first(source, "read_speed", "velocidade_de_leitura"), "gb"),
      writeSpeedMbps: parseNumberWithUnit(first(source, "write_speed", "velocidade_de_gravacao"), "gb")
    }; break;
    case "fonte": specifications = {
      kind: "psu", wattage: parseNumberWithUnit(first(source, "wattage", "potencia"), "watts"), certification: text(first(source, "certification", "certificacao")),
      formFactor: text(first(source, "form_factor", "formato")), modularity: text(first(source, "modularity", "modularidade")), pcieConnectors: first(source, "pcie_connectors", "conectores_pcie") ?? null,
      has12Vhpwr: bool(first(source, "has_12vhpwr", "12vhpwr")), activePfc: bool(first(source, "active_pfc", "pfc_ativo"))
    }; break;
    case "gabinete": specifications = {
      kind: "case", motherboardFormFactors: first(source, "motherboard_form_factors", "formatos_de_placa_mae") ?? null,
      maxGpuLengthMm: parseNumberWithUnit(first(source, "max_gpu_length", "comprimento_maximo_da_gpu"), "mm"), maxCoolerHeightMm: parseNumberWithUnit(first(source, "max_cooler_height", "altura_maxima_do_cooler"), "mm"),
      maxRadiatorMm: parseNumberWithUnit(first(source, "max_radiator", "radiador_maximo"), "mm"), psuFormFactors: first(source, "psu_form_factors", "formatos_de_fonte") ?? null,
      fanSlots: integer(first(source, "fan_slots", "ventoinhas_suportadas"))
    }; break;
    case "cooler": specifications = {
      kind: "cooler", coolerType: text(first(source, "cooler_type", "tipo")), supportedSockets: first(source, "supported_sockets", "sockets_suportados") ?? null,
      heightMm: parseNumberWithUnit(first(source, "height", "altura"), "mm"), radiatorMm: parseNumberWithUnit(first(source, "radiator", "tamanho_do_radiador"), "mm"),
      supportedTdpWatts: parseNumberWithUnit(first(source, "supported_tdp", "tdp_suportado"), "watts")
    }; break;
  }
  const verifiedFields = Object.entries(specifications).filter(([key, value]) => key !== "kind" && value !== null && value !== undefined).map(([key]) => key);
  const missingCriticalFields = criticalFields[categorySlug].filter((field) => specifications[field] === null || specifications[field] === undefined);
  const missingFields = Object.entries(specifications).filter(([key, value]) => key !== "kind" && (value === null || value === undefined)).map(([key]) => key);
  const status = missingFields.length === 0 ? "verified" : verifiedFields.length > 0 ? "partial" : "unverified";
  return { categorySlug, brand, model, specifications, verifiedFields, missingCriticalFields, status };
}
