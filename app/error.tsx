"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="container-shell grid min-h-[55vh] place-items-center py-16 text-center"><div><AlertTriangle className="mx-auto text-amber-300" size={40} /><h1 className="mt-5 text-3xl font-black">Algo saiu do trilho</h1><p className="mt-2 text-slate-400">Tente novamente. Sua montagem salva no navegador não foi apagada.</p><Button className="mt-6" onClick={reset}>Tentar novamente</Button></div></div>;
}
