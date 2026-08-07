import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "Monte Seu PC", short_name: "Monte Seu PC", description: "Montador de computadores com verificação de compatibilidade.", start_url: "/", display: "standalone", background_color: "#07090c", theme_color: "#22d3ee", lang: "pt-BR" };
}
