import { NextResponse } from "next/server";
import { savePublicBuild } from "@/lib/builds";
import { limitByIp, PayloadTooLargeError, readJsonLimited } from "@/lib/security/request";
import { buildPayloadSchema } from "@/lib/validations/schemas";

export async function POST(request: Request) {
  const limited = limitByIp(request, "builds", 10, 10 * 60_000);
  if (limited) return limited;
  let body: unknown;
  try { body = await readJsonLimited(request, 4_096); }
  catch (error) {
    return NextResponse.json({ error: error instanceof PayloadTooLargeError ? error.message : "JSON inválido." }, { status: error instanceof PayloadTooLargeError ? 413 : 400 });
  }
  const parsed = buildPayloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados da montagem inválidos." }, { status: 400 });
  try {
    const saved = await savePublicBuild(parsed.data);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    // Mensagens de validação do catálogo são seguras; qualquer outra coisa vira genérica.
    const message = error instanceof Error && /^(Componente|Oferta) inválid/.test(error.message) ? error.message : "Não foi possível salvar a montagem.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
