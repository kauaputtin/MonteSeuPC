import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Monte Seu PC — Compatibilidade e preços", template: "%s | Monte Seu PC" },
  description: "Monte um computador passo a passo, valide a compatibilidade das peças e compare ofertas importadas de fontes autorizadas.",
  openGraph: { title: "Monte Seu PC sem medo de errar", description: "Escolha peças compatíveis e compare ofertas em um só lugar.", type: "website", locale: "pt_BR" },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a href="#conteudo" className="fixed left-3 top-3 z-[100] -translate-y-20 rounded bg-cyan-300 px-4 py-2 font-bold text-slate-950 focus:translate-y-0">Pular para o conteúdo</a>
        <SiteHeader />
        <main id="conteudo">{children}</main>
        <SiteFooter />
        <Toaster theme="dark" richColors position="top-right" />
      </body>
    </html>
  );
}
