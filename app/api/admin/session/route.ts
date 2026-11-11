import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp, readJsonLimited, tooManyRequests } from "@/lib/security/request";

const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(8).max(200) });
const WINDOW_MS = 15 * 60_000;
const INVALID = "Credenciais inválidas ou usuário sem acesso.";

// O login acontece no servidor: a chave pública do Supabase não precisa
// ser enviada ao navegador e as tentativas ficam limitadas por IP e por conta.
export async function POST(request: Request) {
  const ip = clientIp(request);
  const byIp = rateLimit(`login:ip:${ip}`, 10, WINDOW_MS);
  if (!byIp.allowed) return tooManyRequests(byIp.retryAfterSeconds, "Muitas tentativas. Tente novamente mais tarde.");

  let body: z.infer<typeof loginSchema>;
  try { body = loginSchema.parse(await readJsonLimited(request, 2_048)); }
  catch { return NextResponse.json({ error: INVALID }, { status: 400 }); }

  const byAccount = rateLimit(`login:email:${body.email.toLowerCase()}`, 5, WINDOW_MS);
  if (!byAccount.allowed) return tooManyRequests(byAccount.retryAfterSeconds, "Muitas tentativas. Tente novamente mais tarde.");

  const supabase = await createAuthenticatedSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Autenticação indisponível." }, { status: 503 });
  const { data, error } = await supabase.auth.signInWithPassword(body);
  if (error || !data.user) return NextResponse.json({ error: INVALID }, { status: 401 });

  const { data: profile } = await supabase.from("admin_profiles").select("role").eq("user_id", data.user.id).in("role", ["admin", "editor"]).maybeSingle();
  if (!profile) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: INVALID }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await createAuthenticatedSupabaseClient();
  await supabase?.auth.signOut();
  return NextResponse.json({ ok: true });
}
