import type { MetadataRoute } from "next";
import { components } from "@/data/mock-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/montar`, changeFrequency: "weekly", priority: 0.9 },
    ...components.map((component) => ({ url: `${baseUrl}/componente/${component.slug}`, changeFrequency: "weekly" as const, priority: 0.7 }))
  ];
}
