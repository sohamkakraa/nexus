import type { MetadataRoute } from "next";

const base = "https://nexus.sohamkakra.com";
const lastModified = new Date("2026-07-10");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/docs`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/security`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/changelog`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/community`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/legal`, lastModified, changeFrequency: "yearly", priority: 0.4 },
  ];
}
