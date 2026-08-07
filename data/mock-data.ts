import type {
  Category,
  CategorySlug,
  Component,
  ComponentSpecifications,
  Offer,
  Store
} from "@/types/domain";

export const categories: Category[] = [
  { id: "cat-cpu", name: "Processador", slug: "processador", sortOrder: 1, description: "Define o desempenho geral e a plataforma do computador." },
  { id: "cat-mb", name: "Placa-mãe", slug: "placa-mae", sortOrder: 2, description: "Conecta os componentes e determina socket, memória e expansões." },
  { id: "cat-ram", name: "Memória RAM", slug: "memoria-ram", sortOrder: 3, description: "Mantém programas e jogos disponíveis para acesso rápido." },
  { id: "cat-gpu", name: "Placa de vídeo", slug: "placa-de-video", sortOrder: 4, description: "Processa gráficos, jogos, vídeo e cargas aceleradas." },
  { id: "cat-storage", name: "Armazenamento", slug: "armazenamento", sortOrder: 5, description: "Guarda o sistema, aplicativos, jogos e arquivos." },
  { id: "cat-psu", name: "Fonte", slug: "fonte", sortOrder: 6, description: "Fornece energia estável e segura para toda a configuração." },
  { id: "cat-case", name: "Gabinete", slug: "gabinete", sortOrder: 7, description: "Acomoda as peças e define os limites físicos da montagem." },
  { id: "cat-cooler", name: "Cooler", slug: "cooler", sortOrder: 8, description: "Controla a temperatura do processador durante o uso." }
];

function component(
  id: string,
  categorySlug: CategorySlug,
  brand: string,
  name: string,
  description: string,
  estimatedWatts: number,
  specifications: ComponentSpecifications
): Component {
  return {
    id,
    categorySlug,
    brand,
    name,
    slug: `${brand}-${name}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    description,
    imageUrl: `/products/${categorySlug}.svg`,
    specifications,
    estimatedWatts,
    active: true
  };
}

export const components: Component[] = [
  component("cpu-am5-6", "processador", "Aurora Demo", "A6 7600", "Processador demonstrativo eficiente para jogos e uso geral.", 65, { kind: "processor", socket: "AM5", cores: 6, threads: 12, baseClockGhz: 3.8, turboClockGhz: 5.1, tdpWatts: 65, integratedGraphics: true, coolerIncluded: true }),
  component("cpu-am5-8", "processador", "Aurora Demo", "A8 7800X", "Processador demonstrativo de oito núcleos para alto desempenho.", 120, { kind: "processor", socket: "AM5", cores: 8, threads: 16, baseClockGhz: 4.2, turboClockGhz: 5, tdpWatts: 120, integratedGraphics: false, coolerIncluded: false }),
  component("cpu-lga1700-6", "processador", "Vector Demo", "V5 14400", "Processador demonstrativo híbrido para produtividade.", 65, { kind: "processor", socket: "LGA1700", cores: 10, threads: 16, baseClockGhz: 2.5, turboClockGhz: 4.7, tdpWatts: 65, integratedGraphics: true, coolerIncluded: true }),
  component("cpu-lga1700-8", "processador", "Vector Demo", "V7 14700F", "Processador demonstrativo de alto desempenho sem vídeo integrado.", 125, { kind: "processor", socket: "LGA1700", cores: 20, threads: 28, baseClockGhz: 2.1, turboClockGhz: 5.4, tdpWatts: 125, integratedGraphics: false, coolerIncluded: false }),

  component("mb-am5-ddr5-atx", "placa-mae", "NexBoard Demo", "B650 Atlas", "Placa-mãe AM5 ATX com DDR5 e Wi-Fi.", 55, { kind: "motherboard", socket: "AM5", chipset: "B650", formFactor: "ATX", memoryType: "DDR5", memorySlots: 4, maxMemoryGb: 192, m2Slots: 3, sataPorts: 4, pcieVersion: 4, wifi: true, storageInterfaces: ["M.2 NVMe", "SATA"] }),
  component("mb-am5-ddr5-matx", "placa-mae", "NexBoard Demo", "A620 Compact", "Placa-mãe AM5 compacta para configurações econômicas.", 45, { kind: "motherboard", socket: "AM5", chipset: "A620", formFactor: "Micro-ATX", memoryType: "DDR5", memorySlots: 2, maxMemoryGb: 96, m2Slots: 1, sataPorts: 4, pcieVersion: 4, wifi: false, biosWarning: "Este processador pode exigir BIOS versão 2.1 ou mais recente.", storageInterfaces: ["M.2 NVMe", "SATA"] }),
  component("mb-lga-ddr4-atx", "placa-mae", "CoreGrid Demo", "B760 Forge D4", "Placa-mãe LGA1700 ATX compatível com DDR4.", 50, { kind: "motherboard", socket: "LGA1700", chipset: "B760", formFactor: "ATX", memoryType: "DDR4", memorySlots: 4, maxMemoryGb: 128, m2Slots: 2, sataPorts: 4, pcieVersion: 4, wifi: false, storageInterfaces: ["M.2 NVMe", "SATA"] }),
  component("mb-lga-ddr5-itx", "placa-mae", "CoreGrid Demo", "Z790 Nano", "Placa-mãe Mini-ITX demonstrativa com DDR5.", 48, { kind: "motherboard", socket: "LGA1700", chipset: "Z790", formFactor: "Mini-ITX", memoryType: "DDR5", memorySlots: 2, maxMemoryGb: 96, m2Slots: 2, sataPorts: 2, pcieVersion: 5, wifi: true, storageInterfaces: ["M.2 NVMe", "SATA"] }),

  component("ram-ddr5-32", "memoria-ram", "Pulse Demo", "Neon 32 GB 6000", "Kit demonstrativo DDR5 de alto desempenho.", 10, { kind: "memory", memoryType: "DDR5", capacityGb: 32, modules: 2, frequencyMhz: 6000, latency: "CL36", voltage: 1.35 }),
  component("ram-ddr5-64", "memoria-ram", "Pulse Demo", "Studio 64 GB 5600", "Kit demonstrativo DDR5 para criação e produtividade.", 14, { kind: "memory", memoryType: "DDR5", capacityGb: 64, modules: 2, frequencyMhz: 5600, latency: "CL40", voltage: 1.25 }),
  component("ram-ddr4-16", "memoria-ram", "ByteWorks Demo", "Core 16 GB 3200", "Kit demonstrativo DDR4 para configurações equilibradas.", 7, { kind: "memory", memoryType: "DDR4", capacityGb: 16, modules: 2, frequencyMhz: 3200, latency: "CL16", voltage: 1.35 }),
  component("ram-ddr4-128", "memoria-ram", "ByteWorks Demo", "Max 128 GB 3600", "Kit demonstrativo DDR4 com quatro módulos.", 18, { kind: "memory", memoryType: "DDR4", capacityGb: 128, modules: 4, frequencyMhz: 3600, latency: "CL18", voltage: 1.35 }),

  component("gpu-180", "placa-de-video", "Photon Demo", "P760 8 GB", "GPU demonstrativa compacta e eficiente.", 165, { kind: "gpu", chipMaker: "Photon", vramGb: 8, lengthMm: 240, slots: 2, powerWatts: 165, recommendedPsuWatts: 550, powerConnectors: ["1x 8 pinos"] }),
  component("gpu-260", "placa-de-video", "Photon Demo", "P780 16 GB", "GPU demonstrativa para jogos em alta resolução.", 263, { kind: "gpu", chipMaker: "Photon", vramGb: 16, lengthMm: 320, slots: 3, powerWatts: 263, recommendedPsuWatts: 700, powerConnectors: ["2x 8 pinos"] }),
  component("gpu-220", "placa-de-video", "Raster Demo", "R4070 12 GB", "GPU demonstrativa com conector de nova geração.", 220, { kind: "gpu", chipMaker: "Raster", vramGb: 12, lengthMm: 300, slots: 3, powerWatts: 220, recommendedPsuWatts: 650, powerConnectors: ["12VHPWR"] }),
  component("gpu-355", "placa-de-video", "Raster Demo", "R4080 16 GB", "GPU demonstrativa grande para cargas intensas.", 355, { kind: "gpu", chipMaker: "Raster", vramGb: 16, lengthMm: 358, slots: 4, powerWatts: 355, recommendedPsuWatts: 850, powerConnectors: ["12VHPWR"] }),

  component("ssd-nvme-1", "armazenamento", "FlashPoint Demo", "N1 1 TB", "SSD NVMe demonstrativo para sistema e jogos.", 7, { kind: "storage", storageType: "SSD NVMe", capacityGb: 1000, interface: "M.2 NVMe", formFactor: "M.2 2280", readSpeedMbps: 5000, writeSpeedMbps: 4200 }),
  component("ssd-nvme-2", "armazenamento", "FlashPoint Demo", "N2 2 TB", "SSD NVMe demonstrativo de alta capacidade.", 9, { kind: "storage", storageType: "SSD NVMe", capacityGb: 2000, interface: "M.2 NVMe", formFactor: "M.2 2280", readSpeedMbps: 7000, writeSpeedMbps: 6500 }),
  component("ssd-sata-1", "armazenamento", "DataNest Demo", "S1 1 TB", "SSD SATA demonstrativo de 2,5 polegadas.", 5, { kind: "storage", storageType: "SSD SATA", capacityGb: 1000, interface: "SATA", formFactor: "2,5 pol.", readSpeedMbps: 560, writeSpeedMbps: 520 }),
  component("hdd-2", "armazenamento", "DataNest Demo", "Archive 2 TB", "Disco rígido demonstrativo para arquivos.", 8, { kind: "storage", storageType: "HDD", capacityGb: 2000, interface: "SATA", formFactor: "3,5 pol.", readSpeedMbps: 180, writeSpeedMbps: 170 }),

  component("psu-500", "fonte", "VoltSafe Demo", "V500 Bronze", "Fonte ATX demonstrativa de entrada.", 0, { kind: "psu", wattage: 500, certification: "80 Plus Bronze", formFactor: "ATX", modularity: "Não modular", pcieConnectors: ["1x 8 pinos"], has12Vhpwr: false, activePfc: true }),
  component("psu-650", "fonte", "VoltSafe Demo", "V650 Gold", "Fonte ATX demonstrativa semi-modular.", 0, { kind: "psu", wattage: 650, certification: "80 Plus Gold", formFactor: "ATX", modularity: "Semi-modular", pcieConnectors: ["2x 8 pinos"], has12Vhpwr: false, activePfc: true }),
  component("psu-750", "fonte", "PowerNest Demo", "P750 Gold", "Fonte ATX demonstrativa com 12VHPWR.", 0, { kind: "psu", wattage: 750, certification: "80 Plus Gold", formFactor: "ATX", modularity: "Modular", pcieConnectors: ["2x 8 pinos", "12VHPWR"], has12Vhpwr: true, activePfc: true }),
  component("psu-850-sfx", "fonte", "PowerNest Demo", "P850 SFX", "Fonte SFX demonstrativa compacta e modular.", 0, { kind: "psu", wattage: 850, certification: "80 Plus Gold", formFactor: "SFX", modularity: "Modular", pcieConnectors: ["3x 8 pinos", "12VHPWR"], has12Vhpwr: true, activePfc: true }),

  component("case-atx-330", "gabinete", "FrameLab Demo", "Air 330", "Gabinete ATX demonstrativo com frente ventilada.", 15, { kind: "case", motherboardFormFactors: ["ATX", "Micro-ATX", "Mini-ITX"], maxGpuLengthMm: 330, maxCoolerHeightMm: 165, maxRadiatorMm: 360, psuFormFactors: ["ATX"], fanSlots: 7 }),
  component("case-matx-280", "gabinete", "FrameLab Demo", "Mini Air 280", "Gabinete Micro-ATX demonstrativo e compacto.", 12, { kind: "case", motherboardFormFactors: ["Micro-ATX", "Mini-ITX"], maxGpuLengthMm: 280, maxCoolerHeightMm: 155, maxRadiatorMm: 240, psuFormFactors: ["ATX", "SFX"], fanSlots: 5 }),
  component("case-itx-240", "gabinete", "NanoShell Demo", "N20", "Gabinete Mini-ITX demonstrativo de pequeno volume.", 10, { kind: "case", motherboardFormFactors: ["Mini-ITX"], maxGpuLengthMm: 240, maxCoolerHeightMm: 75, maxRadiatorMm: 120, psuFormFactors: ["SFX"], fanSlots: 3 }),
  component("case-atx-400", "gabinete", "NanoShell Demo", "Tower 400", "Gabinete ATX amplo para componentes grandes.", 18, { kind: "case", motherboardFormFactors: ["ATX", "Micro-ATX", "Mini-ITX"], maxGpuLengthMm: 400, maxCoolerHeightMm: 185, maxRadiatorMm: 420, psuFormFactors: ["ATX", "SFX"], fanSlots: 10 }),

  component("cooler-air-150", "cooler", "Frost Demo", "Aero 150", "Air cooler demonstrativo compacto.", 5, { kind: "cooler", coolerType: "Air cooler", supportedSockets: ["AM5", "LGA1700"], heightMm: 150, supportedTdpWatts: 180 }),
  component("cooler-air-170", "cooler", "Frost Demo", "Tower 170", "Air cooler demonstrativo de torre dupla.", 8, { kind: "cooler", coolerType: "Air cooler", supportedSockets: ["AM5"], heightMm: 170, supportedTdpWatts: 250 }),
  component("cooler-water-240", "cooler", "LiquidArc Demo", "Flow 240", "Water cooler demonstrativo com radiador de 240 mm.", 12, { kind: "cooler", coolerType: "Water cooler", supportedSockets: ["AM5", "LGA1700"], radiatorMm: 240, supportedTdpWatts: 250 }),
  component("cooler-water-360", "cooler", "LiquidArc Demo", "Flow 360", "Water cooler demonstrativo com radiador de 360 mm.", 15, { kind: "cooler", coolerType: "Water cooler", supportedSockets: ["LGA1700"], radiatorMm: 360, supportedTdpWatts: 320 })
];

export const stores: Store[] = [
  { id: "store-orbit", name: "Loja Órbita (demo)", slug: "loja-orbita-demo", websiteUrl: "https://example.com", active: true },
  { id: "store-circuit", name: "Circuito Shop (demo)", slug: "circuito-shop-demo", websiteUrl: "https://example.org", active: true },
  { id: "store-pixel", name: "Pixel Hardware (demo)", slug: "pixel-hardware-demo", websiteUrl: "https://example.net", active: true }
];

const basePrices: Record<CategorySlug, number> = {
  processador: 1099,
  "placa-mae": 899,
  "memoria-ram": 399,
  "placa-de-video": 1899,
  armazenamento: 349,
  fonte: 449,
  gabinete: 359,
  cooler: 189
};

export const offers: Offer[] = components.flatMap((item, index) => {
  const base = basePrices[item.categorySlug] + (index % 4) * 170;
  return [
    {
      id: `offer-${item.id}-orbit`, componentId: item.id, storeId: "store-orbit", price: base + 60,
      pixPrice: base, installmentPrice: base + 60, installments: 10, productUrl: `https://example.com/produto/${item.slug}`,
      affiliate: true, available: true, lastCheckedAt: "2026-01-15T14:00:00.000Z"
    },
    {
      id: `offer-${item.id}-circuit`, componentId: item.id, storeId: "store-circuit", price: base + 35,
      installmentPrice: base + 35, installments: 8, shippingPrice: index % 3 === 0 ? 24.9 : undefined,
      productUrl: `https://example.org/item/${item.slug}`, affiliate: false, available: true, lastCheckedAt: "2026-01-15T13:30:00.000Z"
    },
    ...(index % 3 === 0 ? [{
      id: `offer-${item.id}-pixel`, componentId: item.id, storeId: "store-pixel", price: base + 90,
      pixPrice: base + 20, installmentPrice: base + 90, installments: 12,
      productUrl: `https://example.net/p/${item.slug}`, affiliate: true, available: index % 6 !== 0, lastCheckedAt: "2026-01-15T12:00:00.000Z"
    }] satisfies Offer[] : [])
  ];
});

export const demoBuilds = [
  { name: "PC equilibrado para jogar", description: "AM5, 32 GB DDR5 e GPU de 8 GB", componentIds: ["cpu-am5-6", "mb-am5-ddr5-atx", "ram-ddr5-32", "gpu-180", "ssd-nvme-1", "psu-650", "case-atx-330", "cooler-air-150"] },
  { name: "Estação compacta", description: "LGA1700 e formato Mini-ITX", componentIds: ["cpu-lga1700-6", "mb-lga-ddr5-itx", "ram-ddr5-32", "gpu-180", "ssd-nvme-2", "psu-850-sfx", "case-itx-240"] }
];

export function getOffersForComponent(componentId: string) {
  return offers
    .filter((offer) => offer.componentId === componentId && offer.available)
    .sort((a, b) => (a.pixPrice ?? a.price) - (b.pixPrice ?? b.price));
}

export function getEffectivePrice(offer: Offer) {
  return offer.pixPrice ?? offer.price;
}
