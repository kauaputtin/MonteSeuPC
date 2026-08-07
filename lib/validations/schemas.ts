import { z } from "zod";
import { categorySlugs } from "@/types/domain";

const socket = z.string().trim().min(2).max(30);
const positiveNumber = z.number().finite().positive();

export const processorSchema = z.object({
  kind: z.literal("processor"), socket, cores: z.number().int().positive(), threads: z.number().int().positive(),
  baseClockGhz: positiveNumber, turboClockGhz: positiveNumber, tdpWatts: positiveNumber,
  integratedGraphics: z.boolean(), coolerIncluded: z.boolean()
});

export const motherboardSchema = z.object({
  kind: z.literal("motherboard"), socket, chipset: z.string().trim().min(2),
  formFactor: z.enum(["ATX", "Micro-ATX", "Mini-ITX"]), memoryType: z.enum(["DDR4", "DDR5"]),
  memorySlots: z.number().int().positive(), maxMemoryGb: z.number().int().positive(), m2Slots: z.number().int().nonnegative(),
  sataPorts: z.number().int().nonnegative(), pcieVersion: positiveNumber, wifi: z.boolean(), biosWarning: z.string().optional(),
  storageInterfaces: z.array(z.string().min(2)).min(1)
});

export const memorySchema = z.object({
  kind: z.literal("memory"), memoryType: z.enum(["DDR4", "DDR5"]), capacityGb: z.number().int().positive(),
  modules: z.number().int().positive(), frequencyMhz: z.number().int().positive(), latency: z.string().min(2), voltage: positiveNumber
});

export const gpuSchema = z.object({
  kind: z.literal("gpu"), chipMaker: z.string().min(2), vramGb: z.number().int().positive(), lengthMm: positiveNumber,
  slots: positiveNumber, powerWatts: positiveNumber, recommendedPsuWatts: positiveNumber,
  powerConnectors: z.array(z.string()).min(1)
});

export const storageSchema = z.object({
  kind: z.literal("storage"), storageType: z.enum(["SSD SATA", "SSD NVMe", "HDD"]), capacityGb: z.number().int().positive(),
  interface: z.string().min(2), formFactor: z.string().min(2), readSpeedMbps: positiveNumber, writeSpeedMbps: positiveNumber
});

export const psuSchema = z.object({
  kind: z.literal("psu"), wattage: positiveNumber, certification: z.string().min(2), formFactor: z.enum(["ATX", "SFX"]),
  modularity: z.enum(["Não modular", "Semi-modular", "Modular"]), pcieConnectors: z.array(z.string()), has12Vhpwr: z.boolean(), activePfc: z.boolean()
});

export const caseSchema = z.object({
  kind: z.literal("case"), motherboardFormFactors: z.array(z.enum(["ATX", "Micro-ATX", "Mini-ITX"])).min(1),
  maxGpuLengthMm: positiveNumber, maxCoolerHeightMm: positiveNumber, maxRadiatorMm: positiveNumber,
  psuFormFactors: z.array(z.enum(["ATX", "SFX"])).min(1), fanSlots: z.number().int().positive()
});

export const coolerSchema = z.object({
  kind: z.literal("cooler"), coolerType: z.enum(["Air cooler", "Water cooler"]), supportedSockets: z.array(socket).min(1),
  heightMm: positiveNumber.optional(), radiatorMm: positiveNumber.optional(), supportedTdpWatts: positiveNumber
});

export const specificationsSchema = z.discriminatedUnion("kind", [
  processorSchema, motherboardSchema, memorySchema, gpuSchema, storageSchema, psuSchema, caseSchema, coolerSchema
]);

export const componentFormSchema = z.object({
  categorySlug: z.enum(categorySlugs), brand: z.string().trim().min(2).max(80), name: z.string().trim().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().trim().min(10).max(1200),
  imageUrl: z.url().or(z.string().startsWith("/")), specifications: specificationsSchema,
  estimatedWatts: z.number().finite().nonnegative(), active: z.boolean()
});

export const storeFormSchema = z.object({
  name: z.string().trim().min(2).max(100), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  logoUrl: z.url().optional().or(z.literal("")), websiteUrl: z.url(), active: z.boolean()
});

export const offerFormSchema = z.object({
  componentId: z.string().uuid(), storeId: z.string().uuid(), price: positiveNumber,
  pixPrice: positiveNumber.optional(), installmentPrice: positiveNumber.optional(), installments: z.number().int().positive().max(36).optional(),
  shippingPrice: z.number().finite().nonnegative().optional(), productUrl: z.url(), affiliate: z.boolean(), available: z.boolean()
});

export const buildPayloadSchema = z.object({
  name: z.string().trim().min(2).max(80).default("Minha montagem"),
  components: z.partialRecord(z.enum(categorySlugs), z.string().min(1)).refine((value) => Object.keys(value).length > 0, "Selecione ao menos um componente."),
  offers: z.partialRecord(z.enum(categorySlugs), z.string().min(1))
});
