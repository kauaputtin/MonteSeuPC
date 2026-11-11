import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeExternalProduct } from "@/integrations/core/normalizer";
import { inspectCsv, parseCsvProducts } from "@/integrations/providers/csv/csv-parser";
import { getAdminApiContext, safeErrorMessage } from "@/lib/admin-api";

const bodySchema = z.object({ content: z.string().min(1).max(5_000_000), mapping: z.record(z.string(), z.string()).optional() });

export async function POST(request: Request) {
  if (!await getAdminApiContext()) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const body = bodySchema.parse(await request.json());
    const inspected = inspectCsv(body.content);
    const parsed = parseCsvProducts(body.content, body.mapping);
    return NextResponse.json({ headers: inspected.headers, totalRows: inspected.rows.length, validRows: parsed.products.length, errors: parsed.errors.slice(0, 100), preview: parsed.products.slice(0, 20).map((product) => ({ product, normalized: normalizeExternalProduct(product) })) });
  } catch (error) { return NextResponse.json({ error: safeErrorMessage(error, "CSV inválido.") }, { status: 400 }); }
}
