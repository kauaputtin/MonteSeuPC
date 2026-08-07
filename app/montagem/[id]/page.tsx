import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicBuildView } from "@/features/builder/public-build-view";
import { decodeDemoBuild, getPublicBuild } from "@/lib/builds";
import { getCatalogData } from "@/lib/catalog";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ data?: string }> };

export const metadata: Metadata = { title: "Montagem compartilhada", description: "Veja uma configuração de PC compartilhada e suas ofertas de referência." };

export default async function SharedBuildPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { data } = await searchParams;
  const catalog = await getCatalogData();
  const build = id === "demo" && data ? decodeDemoBuild(data) : await getPublicBuild(id, catalog);
  if (!build) notFound();
  return <PublicBuildView build={build} catalog={catalog} demo={id === "demo"} />;
}
