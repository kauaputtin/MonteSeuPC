import type { Metadata } from "next";
import { BuilderWizard } from "@/features/builder/builder-wizard";
import { getCatalogData } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Montar meu PC",
  description: "Escolha processador, placa-mãe, memória e demais peças com verificação de compatibilidade.",
  robots: { index: true, follow: true }
};

export default async function BuilderPage() {
  return <BuilderWizard catalog={await getCatalogData()} />;
}
