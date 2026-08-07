import { NextResponse } from "next/server";
import { savePublicBuild } from "@/lib/builds";
import { buildPayloadSchema } from "@/lib/validations/schemas";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = buildPayloadSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Dados da montagem inválidos.", details: parsed.error.flatten() }, { status: 400 });
    const saved = await savePublicBuild(parsed.data);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro inesperado." }, { status: 500 });
  }
}
