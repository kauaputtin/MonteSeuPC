import type { Component, ComponentSpecifications } from "@/types/domain";

function values(specs: ComponentSpecifications): [string, string][] {
  switch (specs.kind) {
    case "processor": return [["Socket", specs.socket], ["Núcleos / threads", `${specs.cores} / ${specs.threads}`], ["Clock turbo", `${specs.turboClockGhz} GHz`], ["TDP", `${specs.tdpWatts} W`], ["Vídeo integrado", specs.integratedGraphics ? "Sim" : "Não"], ["Cooler incluso", specs.coolerIncluded ? "Sim" : "Não"]];
    case "motherboard": return [["Socket", specs.socket], ["Chipset", specs.chipset], ["Formato", specs.formFactor], ["Memória", specs.memoryType], ["Slots / limite", `${specs.memorySlots} / ${specs.maxMemoryGb} GB`], ["M.2 / SATA", `${specs.m2Slots} / ${specs.sataPorts}`], ["Wi-Fi", specs.wifi ? "Sim" : "Não"]];
    case "memory": return [["Tipo", specs.memoryType], ["Capacidade", `${specs.capacityGb} GB`], ["Módulos", `${specs.modules}`], ["Frequência", `${specs.frequencyMhz} MHz`], ["Latência", specs.latency]];
    case "gpu": return [["Chip", specs.chipMaker], ["VRAM", `${specs.vramGb} GB`], ["Comprimento", `${specs.lengthMm} mm`], ["Slots", `${specs.slots}`], ["Consumo", `${specs.powerWatts} W`], ["Conector", specs.powerConnectors.join(", ")]];
    case "storage": return [["Tipo", specs.storageType], ["Capacidade", `${specs.capacityGb} GB`], ["Interface", specs.interface], ["Formato", specs.formFactor], ["Leitura", `${specs.readSpeedMbps} MB/s`], ["Gravação", `${specs.writeSpeedMbps} MB/s`]];
    case "psu": return [["Potência", `${specs.wattage} W`], ["Certificação", specs.certification], ["Formato", specs.formFactor], ["Cabos", specs.modularity], ["12VHPWR", specs.has12Vhpwr ? "Sim" : "Não"], ["PFC ativo", specs.activePfc ? "Sim" : "Não"]];
    case "case": return [["Placas-mãe", specs.motherboardFormFactors.join(", ")], ["GPU máxima", `${specs.maxGpuLengthMm} mm`], ["Cooler máximo", `${specs.maxCoolerHeightMm} mm`], ["Radiador máximo", `${specs.maxRadiatorMm} mm`], ["Fonte", specs.psuFormFactors.join(", ")], ["Ventoinhas", `${specs.fanSlots}`]];
    case "cooler": return [["Tipo", specs.coolerType], ["Sockets", specs.supportedSockets.join(", ")], ["Altura", specs.heightMm ? `${specs.heightMm} mm` : "—"], ["Radiador", specs.radiatorMm ? `${specs.radiatorMm} mm` : "—"], ["TDP suportado", `${specs.supportedTdpWatts} W`]];
  }
}

export function getKeySpecifications(component: Component, limit = 3) {
  return values(component.specifications).slice(0, limit);
}

export function SpecificationList({ component }: { component: Component }) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-md border border-slate-800 bg-slate-800 sm:grid-cols-2">
      {values(component.specifications).map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 bg-slate-950/70 px-4 py-3 text-sm"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold text-slate-200">{value}</dd></div>
      ))}
    </dl>
  );
}
