export const categorySlugs = [
  "processador",
  "placa-mae",
  "memoria-ram",
  "placa-de-video",
  "armazenamento",
  "fonte",
  "gabinete",
  "cooler"
] as const;

export type CategorySlug = (typeof categorySlugs)[number];
export type CompatibilityStatus = "compatible" | "warning" | "incompatible";
export type MotherboardFormFactor = "ATX" | "Micro-ATX" | "Mini-ITX";
export type MemoryType = "DDR4" | "DDR5";
export type PsuFormFactor = "ATX" | "SFX";

export interface Category {
  id: string;
  name: string;
  slug: CategorySlug;
  sortOrder: number;
  description: string;
}

export interface ProcessorSpecs {
  kind: "processor";
  socket: string;
  cores: number;
  threads: number;
  baseClockGhz: number;
  turboClockGhz: number;
  tdpWatts: number;
  integratedGraphics: boolean;
  coolerIncluded: boolean;
}

export interface MotherboardSpecs {
  kind: "motherboard";
  socket: string;
  chipset: string;
  formFactor: MotherboardFormFactor;
  memoryType: MemoryType;
  memorySlots: number;
  maxMemoryGb: number;
  m2Slots: number;
  sataPorts: number;
  pcieVersion: number;
  wifi: boolean;
  biosWarning?: string;
  storageInterfaces: string[];
}

export interface MemorySpecs {
  kind: "memory";
  memoryType: MemoryType;
  capacityGb: number;
  modules: number;
  frequencyMhz: number;
  latency: string;
  voltage: number;
}

export interface GpuSpecs {
  kind: "gpu";
  chipMaker: string;
  vramGb: number;
  lengthMm: number;
  slots: number;
  powerWatts: number;
  recommendedPsuWatts: number;
  powerConnectors: string[];
}

export interface StorageSpecs {
  kind: "storage";
  storageType: "SSD SATA" | "SSD NVMe" | "HDD";
  capacityGb: number;
  interface: string;
  formFactor: string;
  readSpeedMbps: number;
  writeSpeedMbps: number;
}

export interface PsuSpecs {
  kind: "psu";
  wattage: number;
  certification: string;
  formFactor: PsuFormFactor;
  modularity: "Não modular" | "Semi-modular" | "Modular";
  pcieConnectors: string[];
  has12Vhpwr: boolean;
  activePfc: boolean;
}

export interface CaseSpecs {
  kind: "case";
  motherboardFormFactors: MotherboardFormFactor[];
  maxGpuLengthMm: number;
  maxCoolerHeightMm: number;
  maxRadiatorMm: number;
  psuFormFactors: PsuFormFactor[];
  fanSlots: number;
}

export interface CoolerSpecs {
  kind: "cooler";
  coolerType: "Air cooler" | "Water cooler";
  supportedSockets: string[];
  heightMm?: number;
  radiatorMm?: number;
  supportedTdpWatts: number;
}

export type ComponentSpecifications =
  | ProcessorSpecs
  | MotherboardSpecs
  | MemorySpecs
  | GpuSpecs
  | StorageSpecs
  | PsuSpecs
  | CaseSpecs
  | CoolerSpecs;

export interface Component {
  id: string;
  categorySlug: CategorySlug;
  brand: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  specifications: ComponentSpecifications;
  estimatedWatts: number;
  active: boolean;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  websiteUrl: string;
  active: boolean;
}

export interface Offer {
  id: string;
  componentId: string;
  storeId: string;
  price: number;
  pixPrice?: number;
  installmentPrice?: number;
  installments?: number;
  shippingPrice?: number;
  productUrl: string;
  affiliate: boolean;
  available: boolean;
  lastCheckedAt: string;
}

export interface CompatibilityResult {
  status: CompatibilityStatus;
  message: string;
  code: string;
  componentIds?: string[];
}

export type SelectedComponents = Partial<Record<CategorySlug, Component>>;
export type SelectedOffers = Partial<Record<CategorySlug, Offer>>;

export interface BuildPayload {
  name: string;
  components: Partial<Record<CategorySlug, string>>;
  offers: Partial<Record<CategorySlug, string>>;
}

export interface PublicBuild {
  publicId: string;
  name: string;
  components: SelectedComponents;
  offers: SelectedOffers;
  createdAt: string;
}
