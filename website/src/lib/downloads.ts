export type DownloadPlatform = "macos" | "windows" | "linux";
export type DownloadArchitecture = "arm64" | "x64";
export type DownloadFormat = "dmg" | "zip" | "nsis" | "appimage" | "deb";
export type SigningStatus = "notarized" | "signed" | "unsigned";

export type PlatformDetection = {
  platform: DownloadPlatform | null;
  architecture: DownloadArchitecture | null;
  confidence: "confident" | "ambiguous" | "unsupported";
  source: "client-hints" | "user-agent";
  reason: string;
};

export type ReleaseAsset = {
  platform: DownloadPlatform;
  architecture: DownloadArchitecture;
  format: DownloadFormat;
  fileName: string;
  url: string;
  sizeBytes: number;
  sha256: string;
  systemRequirements: string;
  installInstructions: string[];
  signing: {
    status: SigningStatus;
    label: string;
  };
};

export type ReleaseManifest = {
  schemaVersion: 1;
  generatedAt: string;
  fallbackUrl: string;
  release: null | {
    version: string;
    channel: "stable" | "prerelease";
    publishedAt: string;
    releaseUrl: string;
    checksumsUrl: string;
    assets: ReleaseAsset[];
  };
};

type UserAgentHints = {
  platform?: string;
  architecture?: string;
  bitness?: string;
  wow64?: boolean;
  getHighEntropyValues?: (
    hints: string[],
  ) => Promise<{ architecture?: string; bitness?: string; platform?: string; wow64?: boolean }>;
};

type NavigatorLike = {
  userAgent: string;
  userAgentData?: UserAgentHints;
};

const FORMAT_PRIORITY: Record<DownloadPlatform, DownloadFormat[]> = {
  macos: ["dmg", "zip"],
  windows: ["nsis", "zip"],
  linux: ["appimage", "deb"],
};

export async function detectCurrentPlatform(
  navigatorLike: NavigatorLike = navigator as NavigatorLike,
): Promise<PlatformDetection> {
  const hints = navigatorLike.userAgentData;
  if (hints?.getHighEntropyValues) {
    try {
      const highEntropy = await hints.getHighEntropyValues([
        "architecture",
        "bitness",
        "platform",
        "wow64",
      ]);
      return detectPlatform({
        userAgent: navigatorLike.userAgent,
        hints: { ...hints, ...highEntropy },
      });
    } catch {
      // Client Hints are optional. A local UA fallback is safer than blocking downloads.
    }
  }
  return detectPlatform({ userAgent: navigatorLike.userAgent, hints });
}

export function detectPlatform({
  userAgent,
  hints,
}: {
  userAgent: string;
  hints?: UserAgentHints;
}): PlatformDetection {
  const hintedPlatform = platformFromValue(hints?.platform);
  const platform = hintedPlatform ?? platformFromUserAgent(userAgent);
  const architecture = architectureFromHints(hints) ?? architectureFromUserAgent(userAgent, platform);
  const source = hintedPlatform || hints?.architecture || hints?.bitness ? "client-hints" : "user-agent";

  if (!platform) {
    return {
      platform: null,
      architecture: null,
      confidence: "unsupported",
      source,
      reason: "This operating system does not have a Nexus desktop build.",
    };
  }
  if (!architecture) {
    return {
      platform,
      architecture: null,
      confidence: "ambiguous",
      source,
      reason: "Your browser did not expose a reliable processor architecture.",
    };
  }
  return {
    platform,
    architecture,
    confidence: "confident",
    source,
    reason: "Operating system and processor architecture matched locally.",
  };
}

export function resolveAsset(
  manifest: ReleaseManifest,
  detection: PlatformDetection,
  selectedArchitecture?: DownloadArchitecture,
):
  | { state: "ready"; asset: ReleaseAsset }
  | { state: "choose-architecture"; architectures: DownloadArchitecture[] }
  | { state: "unsupported" }
  | { state: "no-release" }
  | { state: "unavailable" } {
  if (!manifest.release || manifest.release.channel !== "stable") return { state: "no-release" };
  if (!detection.platform) return { state: "unsupported" };

  const architecture = selectedArchitecture ?? detection.architecture;
  if (!architecture) {
    const architectures = unique(
      manifest.release.assets
        .filter((asset) => asset.platform === detection.platform)
        .map((asset) => asset.architecture),
    );
    return architectures.length ? { state: "choose-architecture", architectures } : { state: "unavailable" };
  }

  const matches = manifest.release.assets.filter(
    (asset) => asset.platform === detection.platform && asset.architecture === architecture,
  );
  const asset = FORMAT_PRIORITY[detection.platform]
    .map((format) => matches.find((candidate) => candidate.format === format))
    .find((candidate): candidate is ReleaseAsset => Boolean(candidate));
  return asset ? { state: "ready", asset } : { state: "unavailable" };
}

export function parseReleaseManifest(value: unknown): ReleaseManifest | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isDate(value.generatedAt) || !isReleaseUrl(value.fallbackUrl)) {
    return null;
  }
  if (value.release === null) return value as ReleaseManifest;
  if (!isRecord(value.release)) return null;

  const release = value.release;
  if (
    typeof release.version !== "string"
    || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(release.version)
    || (release.channel !== "stable" && release.channel !== "prerelease")
    || !isDate(release.publishedAt)
    || !isReleaseUrl(release.releaseUrl)
    || !isReleaseUrl(release.checksumsUrl)
    || !Array.isArray(release.assets)
    || !release.assets.length
    || !release.assets.every(isReleaseAsset)
  ) return null;

  return value as ReleaseManifest;
}

export function formatAssetSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && size >= 1024; index += 1) {
    size /= 1024;
    unit = units[index];
  }
  return `${size >= 100 ? size.toFixed(0) : size.toFixed(1)} ${unit}`;
}

export function platformLabel(platform: DownloadPlatform): string {
  return platform === "macos" ? "macOS" : platform === "windows" ? "Windows" : "Linux";
}

export function architectureLabel(architecture: DownloadArchitecture): string {
  return architecture === "arm64" ? "ARM64" : "x64";
}

function platformFromValue(value?: string): DownloadPlatform | null {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("mac")) return "macos";
  if (normalized.includes("win")) return "windows";
  if (normalized.includes("linux")) return "linux";
  return null;
}

function platformFromUserAgent(userAgent: string): DownloadPlatform | null {
  if (/android|iphone|ipad|ipod|cros/i.test(userAgent)) return null;
  if (/windows/i.test(userAgent)) return "windows";
  if (/macintosh|mac os x/i.test(userAgent)) return "macos";
  if (/linux|x11/i.test(userAgent)) return "linux";
  return null;
}

function architectureFromHints(hints?: UserAgentHints): DownloadArchitecture | null {
  const architecture = hints?.architecture?.toLowerCase() ?? "";
  const bitness = hints?.bitness ?? "";
  if (hints?.wow64 && (architecture === "x86" || architecture === "x86_64")) return "x64";
  if (/^(arm|arm64|aarch64)$/.test(architecture) && bitness !== "32") return "arm64";
  if (/^(x86|x86_64|amd64|x64)$/.test(architecture) && bitness === "64") return "x64";
  if (/^(arm64|aarch64)$/.test(architecture)) return "arm64";
  if (/^(x86_64|amd64|x64)$/.test(architecture)) return "x64";
  return null;
}

function architectureFromUserAgent(
  userAgent: string,
  platform: DownloadPlatform | null,
): DownloadArchitecture | null {
  if (/\b(?:arm64|aarch64)\b/i.test(userAgent)) return "arm64";
  if (platform === "windows" && /\b(?:win64|x64|wow64|amd64)\b/i.test(userAgent)) return "x64";
  if (platform === "linux" && /\b(?:x86_64|amd64|x64)\b/i.test(userAgent)) return "x64";
  // macOS browsers often report "Intel" on both Apple Silicon and Intel Macs.
  return null;
}

function isReleaseAsset(value: unknown): value is ReleaseAsset {
  if (!isRecord(value) || !isRecord(value.signing)) return false;
  return (
    isPlatform(value.platform)
    && isArchitecture(value.architecture)
    && isFormat(value.format)
    && typeof value.fileName === "string"
    && /^[A-Za-z0-9][A-Za-z0-9._-]+$/.test(value.fileName)
    && isReleaseUrl(value.url)
    && Number.isSafeInteger(value.sizeBytes)
    && Number(value.sizeBytes) > 0
    && typeof value.sha256 === "string"
    && /^[a-f0-9]{64}$/.test(value.sha256)
    && typeof value.systemRequirements === "string"
    && value.systemRequirements.length > 0
    && Array.isArray(value.installInstructions)
    && value.installInstructions.length > 0
    && value.installInstructions.every((instruction) => typeof instruction === "string" && instruction.length > 0)
    && ["notarized", "signed", "unsigned"].includes(String(value.signing.status))
    && typeof value.signing.label === "string"
    && value.signing.label.length > 0
  );
}

function isReleaseUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:"
      && url.hostname === "github.com"
      && url.pathname.startsWith("/sohamkakraa/nexus/releases")
      && !url.username
      && !url.password
    );
  } catch {
    return false;
  }
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlatform(value: unknown): value is DownloadPlatform {
  return value === "macos" || value === "windows" || value === "linux";
}

function isArchitecture(value: unknown): value is DownloadArchitecture {
  return value === "arm64" || value === "x64";
}

function isFormat(value: unknown): value is DownloadFormat {
  return value === "dmg" || value === "zip" || value === "nsis" || value === "appimage" || value === "deb";
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
