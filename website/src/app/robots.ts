import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/_next/", "/api/"],
    },
    sitemap: "https://nexus.sohamkakra.com/sitemap.xml",
    host: "https://nexus.sohamkakra.com",
  };
}
