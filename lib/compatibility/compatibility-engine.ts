import type {
  CaseSpecs,
  CompatibilityResult,
  Component,
  CoolerSpecs,
  GpuSpecs,
  MotherboardSpecs,
  ProcessorSpecs,
  PsuSpecs,
  SelectedComponents
} from "@/types/domain";

const commercialPsuRanges = [450, 500, 550, 600, 650, 750, 850, 1000];

function result(
  status: CompatibilityResult["status"],
  code: string,
  message: string,
  componentIds: string[]
): CompatibilityResult {
  return { status, code, message, componentIds };
}

function psuSuppliesConnector(psu: PsuSpecs, required: string) {
  if (required === "12VHPWR") return psu.has12Vhpwr;
  if (psu.pcieConnectors.includes(required)) return true;
  const requiredEightPins = /^(\d+)x 8 pinos$/.exec(required)?.[1];
  if (!requiredEightPins) return false;
  const available = Math.max(0, ...psu.pcieConnectors.map((connector) => Number(/^(\d+)x 8 pinos$/.exec(connector)?.[1] ?? 0)));
  return available >= Number(requiredEightPins);
}

function hasVerifiedSpecifications(...components: Component[]) {
  return components.every((component) => !component.specificationStatus || component.specificationStatus === "verified");
}

export function calculateRawWatts(selected: SelectedComponents) {
  return Object.values(selected).reduce((sum, item) => sum + (item?.estimatedWatts ?? 0), 0);
}

export function calculateEstimatedWatts(selected: SelectedComponents) {
  return Math.ceil(calculateRawWatts(selected) * 1.1);
}

export function calculateRecommendedPsuWatts(selected: SelectedComponents) {
  const target = Math.ceil(calculateRawWatts(selected) * 1.3);
  return commercialPsuRanges.find((range) => range >= target) ?? Math.ceil(target / 100) * 100;
}

export function evaluateBuild(selected: SelectedComponents): CompatibilityResult[] {
  const checks: CompatibilityResult[] = [];
  for (const component of Object.values(selected)) {
    if (component?.specificationStatus && component.specificationStatus !== "verified") {
      checks.push(result(
        "warning",
        `unverified-specifications-${component.id}`,
        `Compatibilidade não verificada para ${component.name}: há especificações técnicas ausentes ou ainda não confirmadas.`,
        [component.id]
      ));
    }
  }
  const cpu = selected.processador;
  const motherboard = selected["placa-mae"];
  const memory = selected["memoria-ram"];
  const gpu = selected["placa-de-video"];
  const storage = selected.armazenamento;
  const psu = selected.fonte;
  const pcCase = selected.gabinete;
  const cooler = selected.cooler;

  if (cpu && motherboard && hasVerifiedSpecifications(cpu, motherboard)) {
    const cpuSpecs = cpu.specifications as ProcessorSpecs;
    const mbSpecs = motherboard.specifications as MotherboardSpecs;
    checks.push(result(
      cpuSpecs.socket === mbSpecs.socket ? "compatible" : "incompatible",
      "cpu-motherboard-socket",
      cpuSpecs.socket === mbSpecs.socket
        ? `Socket ${cpuSpecs.socket} compatível.`
        : `O processador usa ${cpuSpecs.socket}, mas a placa-mãe usa ${mbSpecs.socket}.`,
      [cpu.id, motherboard.id]
    ));
    if (mbSpecs.biosWarning) checks.push(result("warning", "motherboard-bios", mbSpecs.biosWarning, [cpu.id, motherboard.id]));
  }

  if (motherboard && memory && hasVerifiedSpecifications(motherboard, memory) && motherboard.specifications.kind === "motherboard" && memory.specifications.kind === "memory") {
    const mb = motherboard.specifications;
    const ram = memory.specifications;
    checks.push(result(
      mb.memoryType === ram.memoryType ? "compatible" : "incompatible", "memory-type",
      mb.memoryType === ram.memoryType ? `${ram.memoryType} compatível com a placa-mãe.` : `A memória é ${ram.memoryType}, mas a placa-mãe aceita ${mb.memoryType}.`,
      [motherboard.id, memory.id]
    ));
    checks.push(result(
      ram.capacityGb <= mb.maxMemoryGb ? "compatible" : "incompatible", "memory-capacity",
      ram.capacityGb <= mb.maxMemoryGb ? `Capacidade dentro do limite de ${mb.maxMemoryGb} GB.` : `${ram.capacityGb} GB excedem o limite de ${mb.maxMemoryGb} GB.`,
      [motherboard.id, memory.id]
    ));
    checks.push(result(
      ram.modules <= mb.memorySlots ? "compatible" : "incompatible", "memory-slots",
      ram.modules <= mb.memorySlots ? `${ram.modules} módulo(s) cabem nos ${mb.memorySlots} slots.` : `${ram.modules} módulos não cabem nos ${mb.memorySlots} slots disponíveis.`,
      [motherboard.id, memory.id]
    ));
  }

  if (motherboard && pcCase && hasVerifiedSpecifications(motherboard, pcCase) && motherboard.specifications.kind === "motherboard" && pcCase.specifications.kind === "case") {
    const ok = pcCase.specifications.motherboardFormFactors.includes(motherboard.specifications.formFactor);
    checks.push(result(ok ? "compatible" : "incompatible", "motherboard-case-format",
      ok ? `Gabinete aceita placa-mãe ${motherboard.specifications.formFactor}.` : `O gabinete não aceita o formato ${motherboard.specifications.formFactor}.`,
      [motherboard.id, pcCase.id]));
  }

  if (gpu && pcCase && hasVerifiedSpecifications(gpu, pcCase) && gpu.specifications.kind === "gpu" && pcCase.specifications.kind === "case") {
    const ok = gpu.specifications.lengthMm <= pcCase.specifications.maxGpuLengthMm;
    checks.push(result(ok ? "compatible" : "incompatible", "gpu-length",
      ok ? `GPU dentro do limite de ${pcCase.specifications.maxGpuLengthMm} mm.` : `A GPU tem ${gpu.specifications.lengthMm} mm e o gabinete aceita até ${pcCase.specifications.maxGpuLengthMm} mm.`,
      [gpu.id, pcCase.id]));
  }

  if (cooler && pcCase && hasVerifiedSpecifications(cooler, pcCase) && cooler.specifications.kind === "cooler" && pcCase.specifications.kind === "case") {
    const coolerSpecs = cooler.specifications as CoolerSpecs;
    const caseSpecs = pcCase.specifications as CaseSpecs;
    if (coolerSpecs.coolerType === "Air cooler") {
      const ok = (coolerSpecs.heightMm ?? 0) <= caseSpecs.maxCoolerHeightMm;
      checks.push(result(ok ? "compatible" : "incompatible", "air-cooler-height",
        ok ? "Altura do air cooler compatível." : `O cooler tem ${coolerSpecs.heightMm} mm e o gabinete aceita até ${caseSpecs.maxCoolerHeightMm} mm.`,
        [cooler.id, pcCase.id]));
    } else {
      const ok = (coolerSpecs.radiatorMm ?? 0) <= caseSpecs.maxRadiatorMm;
      checks.push(result(ok ? "compatible" : "incompatible", "radiator-size",
        ok ? "Radiador compatível com o gabinete." : `O radiador tem ${coolerSpecs.radiatorMm} mm e o gabinete aceita até ${caseSpecs.maxRadiatorMm} mm.`,
        [cooler.id, pcCase.id]));
    }
  }

  if (cooler && cpu && hasVerifiedSpecifications(cooler, cpu) && cooler.specifications.kind === "cooler" && cpu.specifications.kind === "processor") {
    const ok = cooler.specifications.supportedSockets.includes(cpu.specifications.socket);
    checks.push(result(ok ? "compatible" : "incompatible", "cooler-socket",
      ok ? `Cooler compatível com ${cpu.specifications.socket}.` : `O cooler não inclui suporte ao socket ${cpu.specifications.socket}.`,
      [cooler.id, cpu.id]));
    if (cooler.specifications.supportedTdpWatts < cpu.specifications.tdpWatts) {
      checks.push(result("warning", "cooler-tdp", "A capacidade térmica informada do cooler é inferior ao TDP do processador.", [cooler.id, cpu.id]));
    }
  }

  if (psu && pcCase && hasVerifiedSpecifications(psu, pcCase) && psu.specifications.kind === "psu" && pcCase.specifications.kind === "case") {
    const ok = pcCase.specifications.psuFormFactors.includes(psu.specifications.formFactor);
    checks.push(result(ok ? "compatible" : "incompatible", "psu-case-format",
      ok ? `Gabinete aceita fonte ${psu.specifications.formFactor}.` : `O gabinete não aceita fonte ${psu.specifications.formFactor}.`,
      [psu.id, pcCase.id]));
  }

  if (storage && motherboard && hasVerifiedSpecifications(storage, motherboard) && storage.specifications.kind === "storage" && motherboard.specifications.kind === "motherboard") {
    const ok = motherboard.specifications.storageInterfaces.includes(storage.specifications.interface);
    checks.push(result(ok ? "compatible" : "incompatible", "storage-interface",
      ok ? `Interface ${storage.specifications.interface} disponível.` : `A placa-mãe não oferece interface ${storage.specifications.interface}.`,
      [storage.id, motherboard.id]));
  }

  if (psu && hasVerifiedSpecifications(psu) && psu.specifications.kind === "psu") {
    const recommended = calculateRecommendedPsuWatts(selected);
    const psuSpecs = psu.specifications as PsuSpecs;
    checks.push(result(psuSpecs.wattage >= recommended ? "compatible" : "incompatible", "psu-wattage",
      psuSpecs.wattage >= recommended ? `Fonte atende à recomendação estimada de ${recommended} W.` : `A fonte tem ${psuSpecs.wattage} W; a estimativa recomenda ${recommended} W.`,
      [psu.id]));
    if (gpu && hasVerifiedSpecifications(gpu) && gpu.specifications.kind === "gpu") {
      const gpuSpecs = gpu.specifications as GpuSpecs;
      const missing = gpuSpecs.powerConnectors.filter((required) => !psuSuppliesConnector(psuSpecs, required));
      checks.push(result(missing.length === 0 ? "compatible" : "incompatible", "gpu-power-connectors",
        missing.length === 0 ? "Fonte possui os conectores exigidos pela GPU." : `Faltam conectores para a GPU: ${missing.join(", ")}.`,
        [psu.id, gpu.id]));
    }
  }

  if (cpu && hasVerifiedSpecifications(cpu) && cpu.specifications.kind === "processor" && !cpu.specifications.integratedGraphics && !gpu) {
    checks.push(result("warning", "missing-video-output", "O processador não possui vídeo integrado. Adicione uma placa de vídeo para obter imagem.", [cpu.id]));
  }

  return checks;
}

export function evaluateCandidate(candidate: Component, selected: SelectedComponents) {
  const next = { ...selected, [candidate.categorySlug]: candidate };
  return evaluateBuild(next).filter((check) => check.componentIds?.includes(candidate.id));
}

export function getOverallStatus(checks: CompatibilityResult[]) {
  if (checks.some((check) => check.status === "incompatible")) return "incompatible" as const;
  if (checks.some((check) => check.status === "warning")) return "warning" as const;
  return "compatible" as const;
}
