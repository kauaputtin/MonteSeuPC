import { externalProductSchema } from "@/integrations/schemas/external";
import type { ExternalProduct, ProductCondition } from "@/integrations/types/external";

export const csvColumns = ["store", "external_id", "brand", "model", "title", "category", "gtin", "mpn", "specifications", "price", "pix_price", "available", "condition", "product_url", "image_url", "updated_at"] as const;
export type CsvCanonicalColumn = (typeof csvColumns)[number];
export type CsvColumnMapping = Partial<Record<CsvCanonicalColumn, string>>;
export interface CsvRowError { line: number; messages: string[]; }

function parseRows(input: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = []; let field = ""; let quoted = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { field += '"'; index++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(field.trim()); field = ""; }
    else if (char === "\n") { row.push(field.trim()); rows.push(row); row = []; field = ""; }
    else if (char !== "\r") field += char;
  }
  if (quoted) throw new Error("CSV inválido: aspas não encerradas.");
  if (field.length > 0 || row.length > 0) { row.push(field.trim()); rows.push(row); }
  return rows.filter((current) => current.some(Boolean));
}

function bool(value: string) { return /^(1|true|sim|yes|disponivel|available)$/i.test(value.trim()); }
function condition(value: string): ProductCondition {
  const normalized = value.toLowerCase();
  if (/^new$|novo/.test(normalized)) return "new";
  if (/used|usado/.test(normalized)) return "used";
  if (/refurb|recondicionado/.test(normalized)) return "refurbished";
  if (/open.?box|caixa aberta/.test(normalized)) return "open_box";
  return "unknown";
}

export function inspectCsv(input: string) {
  if (new TextEncoder().encode(input).byteLength > 5_000_000) throw new Error("CSV excede o limite de 5 MB.");
  const clean = input.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const rows = parseRows(clean, delimiter);
  if (rows.length < 2) throw new Error("O CSV precisa conter cabeçalho e ao menos uma linha.");
  if (rows.length > 5_001) throw new Error("O CSV aceita no máximo 5.000 registros por importação.");
  return { headers: rows[0], rows: rows.slice(1), delimiter };
}

export function parseCsvProducts(input: string, mapping: CsvColumnMapping = {}): { products: ExternalProduct[]; errors: CsvRowError[]; headers: string[] } {
  const { headers, rows } = inspectCsv(input);
  const headerIndex = new Map(headers.map((header, index) => [header.trim().toLowerCase(), index]));
  const read = (row: string[], canonical: CsvCanonicalColumn) => row[headerIndex.get((mapping[canonical] ?? canonical).toLowerCase()) ?? -1] ?? "";
  const products: ExternalProduct[] = []; const errors: CsvRowError[] = [];
  rows.forEach((row, index) => {
    try {
    const store = read(row, "store"); const externalId = read(row, "external_id"); const fetchedAtRaw = read(row, "updated_at");
    const price = Number(read(row, "price").replace(",", ".")); const pixRaw = read(row, "pix_price");
    const productUrl = read(row, "product_url"); const title = read(row, "title");
    const providerId = "csv"; const compositeId = `${store}:${externalId}`;
    const offer = {
      providerId, externalId: compositeId, sellerName: store, price, pixPrice: pixRaw ? Number(pixRaw.replace(",", ".")) : undefined,
      currency: "BRL" as const, available: bool(read(row, "available")), condition: condition(read(row, "condition") || "new"),
      productUrl, fetchedAt: fetchedAtRaw ? new Date(fetchedAtRaw).toISOString() : new Date().toISOString()
    };
    const candidate = {
      providerId, externalId: compositeId, externalSku: externalId, gtin: read(row, "gtin") || undefined, ean: read(row, "gtin") || undefined,
      mpn: read(row, "mpn") || undefined, brand: read(row, "brand") || undefined, title, model: read(row, "model") || undefined,
      category: read(row, "category") || undefined, imageUrl: read(row, "image_url") || undefined, productUrl,
      specifications: read(row, "specifications") ? JSON.parse(read(row, "specifications")) as Record<string, unknown> : {}, offers: [offer], fetchedAt: offer.fetchedAt
    };
    const parsed = externalProductSchema.safeParse(candidate);
    if (parsed.success) products.push(parsed.data);
    else errors.push({ line: index + 2, messages: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) });
    } catch (error) {
      errors.push({ line: index + 2, messages: [error instanceof RangeError ? "updated_at: data inválida" : error instanceof SyntaxError ? "specifications: JSON inválido" : "linha inválida"] });
    }
  });
  return { products, errors, headers };
}

export const csvExample = `store,external_id,brand,model,title,category,gtin,mpn,specifications,price,pix_price,available,condition,product_url,image_url,updated_at
Loja autorizada,SKU-001,AMD,Ryzen 5 5600G,Processador AMD Ryzen 5 5600G,processador,730143313414,100-100000252BOX,"{""socket"":""AM4"",""cores"":6,""threads"":12,""tdp"":""65 W""}",899.90,849.90,true,new,https://loja.example/produto/sku-001,https://loja.example/imagens/sku-001.jpg,2026-08-07T12:00:00Z`;
