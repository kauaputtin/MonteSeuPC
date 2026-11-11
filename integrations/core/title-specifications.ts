import { normalizeComparableText } from "@/integrations/core/normalizer";

/**
 * Feeds de afiliados e buscas por palavra-chave misturam peças avulsas com
 * notebooks, PCs completos e periféricos ("Notebook 16GB RAM SSD" não é memória).
 */
const notAPart = /\b(notebook|laptop|ultrabook|chromebook|computador|desktop completo|pc gamer|pc completo|all in one|mini pc|monitor|mouse|teclado|headset|fone|cadeira|mesa|celular|smartphone|tablet|console|playstation|xbox|nintendo|controle|webcam|microfone|caixa de som|impressora|roteador|cabo|adaptador|hub usb|case para|capa|pendrive|pen drive|cartao de memoria|micro sd|microsd|hd externo|ssd externo|ssd portatil|kit upgrade|combo)\b/;

export function isStandalonePcPart(title: string, category?: string) {
  return !notAPart.test(normalizeComparableText(`${category ?? ""} ${title}`));
}

/**
 * Extrai do título o que for inequívoco (socket, DDR, capacidade, potência...).
 * As chaves seguem os nomes que o normalizador já reconhece.
 */
export function inferSpecificationsFromTitle(title: string): Record<string, string | number> {
  const value = title.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const specs: Record<string, string | number> = {};
  const socket = /\b(AM[345]|LGA\s?(?:1151|1200|1700|1851))\b/i.exec(value);
  if (socket) specs.socket = socket[1].replace(/\s/g, "").toUpperCase();
  const ddr = /\bDDR\s?([45])\b/i.exec(value);
  if (ddr) specs.memory_type = `DDR${ddr[1]}`;
  const kit = /\b(\d)\s?x\s?(\d{1,3})\s?GB\b/i.exec(value);
  if (kit) { specs.modules = Number(kit[1]); specs.capacity = `${Number(kit[1]) * Number(kit[2])} GB`; }
  const capacity = /\b(\d{1,2}(?:[.,]\d)?)\s?TB\b|\b(\d{2,4})\s?GB\b/i.exec(value);
  if (capacity && !specs.capacity) specs.capacity = capacity[1] ? `${capacity[1].replace(",", ".")} TB` : `${capacity[2]} GB`;
  const vram = /\b(\d{1,2})\s?GB\b/i.exec(value);
  if (vram && /\b(rtx|gtx|rx\s?\d|radeon|geforce|arc\s?[ab]\d)/i.test(value)) specs.vram = `${vram[1]} GB`;
  const frequency = /\b(\d{4})\s?MHz\b/i.exec(value);
  if (frequency) specs.frequency = `${frequency[1]} MHz`;
  const watts = /\b(\d{3,4})\s?W\b/i.exec(value);
  if (watts && /\bfonte\b|power supply|\bpsu\b/i.test(value)) specs.wattage = `${watts[1]} W`;
  if (/\bnvme\b/i.test(value)) specs.storage_type = "SSD NVMe";
  else if (/\bssd\b/i.test(value) && /\bsata\b/i.test(value)) specs.storage_type = "SSD SATA";
  if (/\bmini[-\s]?itx\b/i.test(value)) specs.form_factor = "Mini-ITX";
  else if (/\b(micro[-\s]?atx|m-?atx)\b/i.test(value)) specs.form_factor = "Micro-ATX";
  else if (/\bATX\b/.test(value)) specs.form_factor = "ATX";
  const certification = /80\s?plus\s?(white|bronze|silver|gold|platinum|titanium)?/i.exec(value);
  if (certification) specs.certification = `80 Plus${certification[1] ? ` ${certification[1][0].toUpperCase()}${certification[1].slice(1).toLowerCase()}` : ""}`;
  return specs;
}

/** Converte "1.234,56", "1234.56" ou "R$ 1.234" em número. */
export function parseMoney(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : undefined;
  if (typeof value !== "string") return undefined;
  let text = value.replace(/[^\d.,]/g, "");
  if (!text) return undefined;
  if (text.includes(",") && text.includes(".")) text = text.lastIndexOf(",") > text.lastIndexOf(".") ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  else if (text.includes(",")) text = text.replace(",", ".");
  const number = Number.parseFloat(text);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : undefined;
}

export function numericIdentifier(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 8 && digits.length <= 14 ? digits : undefined;
}
