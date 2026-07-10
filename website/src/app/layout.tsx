import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nexus.sohamkakra.com"),
  title: {
    default: "Nexus — Two AI models. One considered answer.",
    template: "%s · Nexus",
  },
  description:
    "A free, open-source desktop AI workspace where OpenAI and Anthropic models draft, challenge, and improve one another—privately on your device.",
  applicationName: "Nexus",
  authors: [{ name: "Soham Kakra", url: "https://sohamkakra.com" }],
  creator: "Soham Kakra",
  publisher: "Nexus Open Source",
  category: "Productivity",
  manifest: "/manifest.webmanifest",
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  keywords: [
    "AI desktop app",
    "OpenAI Anthropic app",
    "multi-model AI",
    "local-first AI",
    "MCP client",
    "AI research assistant",
    "open-source desktop AI",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Nexus",
    title: "Nexus — Two AI models. One considered answer.",
    description:
      "OpenAI and Anthropic think independently, challenge each other, and return one useful answer. Free, open source, and local-first.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Nexus AI Council for desktop" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexus — Two AI models. One considered answer.",
    description: "A free, open-source, local-first AI Council for macOS, Windows, and Linux.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#111421",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
