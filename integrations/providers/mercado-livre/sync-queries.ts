const recommendedQueries = [
  "Ryzen 5 5600G", "placa mãe B550M", "memória DDR4 16GB", "RX 6600",
  "SSD NVMe 1TB", "fonte 650W", "gabinete ATX", "cooler AM4"
];

const legacyQueries = [
  "processador", "placa mãe", "memória DDR5", "placa de vídeo",
  "SSD NVMe", "fonte ATX", "gabinete PC", "cooler CPU"
];

function normalize(values: string[]) {
  return values.map((value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()).join("|");
}

export function mercadoLivreSyncQueries() {
  const configured = process.env.MERCADO_LIVRE_SYNC_QUERIES?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  if (!configured.length || normalize(configured) === normalize(legacyQueries)) return recommendedQueries;
  return configured.slice(0, 25);
}
