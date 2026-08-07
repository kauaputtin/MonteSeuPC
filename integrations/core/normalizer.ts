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
  if (match) return match[0];
  return /^(?:115\d|1200|1700|1851)$/.test(normalized) ? `LGA${normalized}` : null;
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
  const declared = normalizeComparableText(product.category ?? "");
  if (/computer processors/.test(declared)) return "processador";
  if (/computer motherboards/.test(declared)) return "placa-mae";
  if (/ram memory modules/.test(declared)) return "memoria-ram";
  if (/graphics cards/.test(declared)) return "placa-de-video";
  if (/hard drives and ssds/.test(declared)) return "armazenamento";
  if (/computer power supplies/.test(declared)) return "fonte";
  if (/computer cases/.test(declared)) return "gabinete";
  if (/computer coolers and fans/.test(declared)) return "cooler";
  const value = normalizeComparableText(`${product.category ?? ""} ${product.title}`);
  if (/motherboard|placa mae/.test(value)) return "placa-mae";
  if (/cpu cooler|computer cooler|water cooler|air cooler|cooler/.test(value)) return "cooler";
  if (/processor|processador|\bcpu\b/.test(value)) return "processador";
  if (/ram|memoria/.test(value)) return "memoria-ram";
  if (/video card|graphics card|placa de video|\bgpu\b|geforce|radeon/.test(value)) return "placa-de-video";
  if (/ssd|nvme|hard drive|disco rigido|armazenamento|\bhdd\b/.test(value)) return "armazenamento";
  if (/power suppl|fonte/.test(value)) return "fonte";
  if (/computer case|gabinete/.test(value)) return "gabinete";
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
      kind: "processor", socket: normalizeSocket(text(first(source, "socket", "socket_do_processador", "compatible_sockets"))),
      cores: integer(first(source, "cores", "nucleos", "quantidade_de_nucleos", "cpu_cores_number")), threads: integer(first(source, "threads", "quantidade_de_threads", "cpu_threads_number")),
      baseClockGhz: parseNumberWithUnit(first(source, "base_clock", "frequencia_base", "min_clock_frequency"), "ghz"), turboClockGhz: parseNumberWithUnit(first(source, "turbo_clock", "frequencia_maxima", "max_clock_frequency"), "ghz"),
      tdpWatts: parseNumberWithUnit(first(source, "tdp", "potencia_de_design_termico"), "watts"), integratedGraphics: bool(first(source, "integrated_graphics", "graficos_integrados")),
      coolerIncluded: bool(first(source, "cooler_included", "inclui_cooler"))
    }; break;
    case "placa-mae": specifications = {
      kind: "motherboard", socket: normalizeSocket(text(first(source, "socket", "cpu_socket", "compatible_sockets"))), chipset: text(first(source, "chipset", "motherboard_chipset")), formFactor: text(first(source, "form_factor", "formato", "motherboard_form_factor")),
      memoryType: normalizeMemoryType(text(first(source, "memory_type", "tipo_de_memoria", "ram_memory_technology", "supported_ram_memory_types"))), memorySlots: integer(first(source, "memory_slots", "slots_de_memoria", "ram_memory_slots_quantity")),
      maxMemoryGb: parseNumberWithUnit(first(source, "max_memory", "capacidade_maxima_de_memoria", "max_ram_memory_capacity"), "gb"), m2Slots: integer(first(source, "m2_slots", "slots_m_2", "m2_slots_quantity")),
      sataPorts: integer(first(source, "sata_ports", "portas_sata", "sata_ports_quantity")), pcieVersion: parseNumberWithUnit(first(source, "pcie_version", "versao_pcie", "pci_express_version"), "gb"),
      wifi: bool(first(source, "wifi", "com_wifi", "with_wifi")), storageInterfaces: first(source, "storage_interfaces", "interfaces_de_armazenamento", "storage_interfaces") ?? null
    }; break;
    case "memoria-ram": specifications = {
      kind: "memory", memoryType: normalizeMemoryType(text(first(source, "memory_type", "tipo_de_memoria", "tecnologia_da_memoria", "ram_memory_module_type"))),
      capacityGb: parseNumberWithUnit(first(source, "capacity", "capacidade_total", "capacidade", "ram_memory_module_total_capacity", "individual_capacity"), "gb"), modules: integer(first(source, "modules", "quantidade_de_modulos", "ram_memory_modules", "units_per_pack")),
      frequencyMhz: parseNumberWithUnit(first(source, "frequency", "frequencia", "tested_speed", "ram_memory_module_speed"), "mhz"), latency: text(first(source, "latency", "latencia", "cas_latency")), voltage: parseNumberWithUnit(first(source, "voltage", "tensao", "ram_memory_module_supply_voltage"), "gb")
    }; break;
    case "placa-de-video": specifications = {
      kind: "gpu", chipMaker: text(first(source, "chip_maker", "fabricante_do_chip", "gpu_brand", "graphics_processor_manufacturer")), vramGb: parseNumberWithUnit(first(source, "vram", "memoria_de_video", "graphic_memory_capacity", "video_memory_capacity"), "gb"),
      lengthMm: parseNumberWithUnit(first(source, "length", "comprimento", "graphics_card_length"), "mm"), slots: parseNumberWithUnit(first(source, "slots", "slots_ocupados", "expansion_slots"), "gb"),
      powerWatts: parseNumberWithUnit(first(source, "power", "consumo", "power_consumption"), "watts"), recommendedPsuWatts: parseNumberWithUnit(first(source, "recommended_psu", "fonte_recomendada", "recommended_power_supply"), "watts"),
      powerConnectors: first(source, "power_connectors", "conectores_de_energia", "power_supply_connectors") ?? null
    }; break;
    case "armazenamento": specifications = {
      kind: "storage", storageType: text(first(source, "storage_type", "tipo", "drive_storage_type")), capacityGb: parseNumberWithUnit(first(source, "capacity", "capacidade"), "gb"),
      interface: text(first(source, "interface", "interfaces", "connectivity")), formFactor: text(first(source, "form_factor", "formato", "hard_drive_and_ssd_form_factor")), readSpeedMbps: parseNumberWithUnit(first(source, "read_speed", "velocidade_de_leitura", "ssd_max_read_speed"), "gb"),
      writeSpeedMbps: parseNumberWithUnit(first(source, "write_speed", "velocidade_de_gravacao", "ssd_max_write_speed"), "gb")
    }; break;
    case "fonte": specifications = {
      kind: "psu", wattage: parseNumberWithUnit(first(source, "wattage", "potencia", "power_output"), "watts"), certification: text(first(source, "certification", "certificacao", "energy_efficiency_certification")),
      formFactor: text(first(source, "form_factor", "formato")), modularity: text(first(source, "modularity", "modularidade", "modulation_type")), pcieConnectors: first(source, "pcie_connectors", "conectores_pcie", "connectivity") ?? null,
      has12Vhpwr: bool(first(source, "has_12vhpwr", "12vhpwr", "with_12vhpwr")), activePfc: bool(first(source, "active_pfc", "pfc_ativo", "with_active_pfc"))
    }; break;
    case "gabinete": specifications = {
      kind: "case", motherboardFormFactors: first(source, "motherboard_form_factors", "formatos_de_placa_mae", "motherboards_compatibility") ?? null,
      maxGpuLengthMm: parseNumberWithUnit(first(source, "max_gpu_length", "comprimento_maximo_da_gpu", "max_graphic_card_length"), "mm"), maxCoolerHeightMm: parseNumberWithUnit(first(source, "max_cooler_height", "altura_maxima_do_cooler", "max_cpu_cooler_height"), "mm"),
      maxRadiatorMm: parseNumberWithUnit(first(source, "max_radiator", "radiador_maximo", "max_radiator_size"), "mm"), psuFormFactors: first(source, "psu_form_factors", "formatos_de_fonte", "power_supply_form_factors") ?? null,
      fanSlots: integer(first(source, "fan_slots", "ventoinhas_suportadas", "max_fans_number"))
    }; break;
    case "cooler": specifications = {
      kind: "cooler", coolerType: text(first(source, "cooler_type", "tipo", "refrigeration_type")), supportedSockets: first(source, "supported_sockets", "sockets_suportados", "compatible_sockets") ?? null,
      heightMm: parseNumberWithUnit(first(source, "height", "altura", "cooler_height"), "mm"), radiatorMm: parseNumberWithUnit(first(source, "radiator", "tamanho_do_radiador", "radiator_size"), "mm"),
      supportedTdpWatts: parseNumberWithUnit(first(source, "supported_tdp", "tdp_suportado", "tdp"), "watts")
    }; break;
  }
  const verifiedFields = Object.entries(specifications).filter(([key, value]) => key !== "kind" && value !== null && value !== undefined).map(([key]) => key);
  const missingCriticalFields = criticalFields[categorySlug].filter((field) => specifications[field] === null || specifications[field] === undefined);
  const missingFields = Object.entries(specifications).filter(([key, value]) => key !== "kind" && (value === null || value === undefined)).map(([key]) => key);
  const status = missingFields.length === 0 ? "verified" : verifiedFields.length > 0 ? "partial" : "unverified";
  return { categorySlug, brand, model, specifications, verifiedFields, missingCriticalFields, status };
}
