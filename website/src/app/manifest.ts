import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nexus — AI Council for macOS",
    short_name: "Nexus",
    description: "Open-source, local-first AI Council for macOS.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#111421",
    categories: ["productivity", "developer", "utilities"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
