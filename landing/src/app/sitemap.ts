import type { MetadataRoute } from "next";
import { content } from "@/content";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: content.meta.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
