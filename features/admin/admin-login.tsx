"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const loginSchema = z.object({ email: z.email("Informe um e-mail válido."), password: z.string().min(8, "Use ao menos 8 caracteres.") });
type LoginValues = z.infer<typeof loginSchema>;

export function AdminLogin() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  async function submit(values: LoginValues) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return toast.error("Supabase não configurado.");
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) return toast.error("Credenciais inválidas ou usuário sem acesso.");
    router.push("/admin"); router.refresh();
  }
  return <form onSubmit={handleSubmit(submit)} className="surface mx-auto mt-16 max-w-md rounded-lg p-6"><LockKeyhole className="text-cyan-300" /><h1 className="mt-4 text-2xl font-black">Acesso administrativo</h1><p className="mt-2 text-sm leading-6 text-slate-400">Entre com uma conta cadastrada em <code>admin_profiles</code>. Credenciais nunca são armazenadas no frontend.</p><label className="mt-6 block text-sm font-bold">E-mail<input {...register("email")} type="email" autoComplete="email" className="mt-2 h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 font-normal" /></label>{errors.email && <p className="mt-1 text-xs text-rose-300">{errors.email.message}</p>}<label className="mt-4 block text-sm font-bold">Senha<input {...register("password")} type="password" autoComplete="current-password" className="mt-2 h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 font-normal" /></label>{errors.password && <p className="mt-1 text-xs text-rose-300">{errors.password.message}</p>}<Button className="mt-6 w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? "Entrando..." : "Entrar"}</Button></form>;
}
