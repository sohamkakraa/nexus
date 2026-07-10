"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./DownloadExperience.module.css";
import {
  architectureLabel,
  detectCurrentPlatform,
  formatAssetSize,
  parseReleaseManifest,
  platformLabel,
  resolveAsset,
  type DownloadArchitecture,
  type PlatformDetection,
  type ReleaseAsset,
  type ReleaseManifest,
} from "@/lib/downloads";

const FALLBACK_URL = "https://github.com/sohamkakraa/nexus/releases";
const EMPTY_DETECTION: PlatformDetection = {
  platform: null,
  architecture: null,
  confidence: "unsupported",
  source: "user-agent",
  reason: "Checking this device locally…",
};

export function DownloadExperience({ compact = false }: { compact?: boolean }) {
  const [manifest, setManifest] = useState<ReleaseManifest | null>(null);
  const [detection, setDetection] = useState<PlatformDetection>(EMPTY_DETECTION);
  const [selectedArchitecture, setSelectedArchitecture] = useState<DownloadArchitecture>();
  const [loading, setLoading] = useState(true);
  const [manifestError, setManifestError] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      detectCurrentPlatform(),
      fetch("/release-manifest.json", { cache: "no-store", credentials: "same-origin" })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Manifest request failed with ${response.status}`);
          return parseReleaseManifest(await response.json());
        }),
    ])
      .then(([nextDetection, nextManifest]) => {
        if (!active) return;
        setDetection(nextDetection);
        setManifest(nextManifest);
        setManifestError(!nextManifest);
      })
      .catch(() => {
        if (active) setManifestError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const resolution = useMemo(
    () => (manifest ? resolveAsset(manifest, detection, selectedArchitecture) : { state: "no-release" as const }),
    [detection, manifest, selectedArchitecture],
  );
  const fallbackUrl = manifest?.fallbackUrl ?? FALLBACK_URL;
  const primaryAsset = resolution.state === "ready" ? resolution.asset : null;

  if (compact) {
    return (
      <div className={styles.compact} data-testid="compact-download">
        <PrimaryAction
          asset={primaryAsset}
          fallbackUrl={fallbackUrl}
          loading={loading}
          noRelease={manifestError || resolution.state === "no-release" || resolution.state === "unavailable"}
          unsupported={resolution.state === "unsupported"}
          choosing={resolution.state === "choose-architecture"}
        />
        {resolution.state === "choose-architecture" && (
          <ArchitectureChooser
            architectures={resolution.architectures}
            onChoose={setSelectedArchitecture}
          />
        )}
      </div>
    );
  }

  return (
    <section className={styles.experience} aria-live="polite">
      <div className={styles.primaryCard}>
        <p className={styles.eyebrow}>Recommended download</p>
        <h2>{primaryHeading(primaryAsset, detection, loading)}</h2>
        <p className={styles.summary}>
          {primarySummary(resolution.state, detection.reason, manifestError, loading)}
        </p>
        <PrimaryAction
          asset={primaryAsset}
          fallbackUrl={fallbackUrl}
          loading={loading}
          noRelease={manifestError || resolution.state === "no-release" || resolution.state === "unavailable"}
          unsupported={resolution.state === "unsupported"}
          choosing={resolution.state === "choose-architecture"}
        />
        {resolution.state === "choose-architecture" && (
          <ArchitectureChooser
            architectures={resolution.architectures}
            onChoose={setSelectedArchitecture}
          />
        )}
        <p className={styles.privacy}>
          Detection runs in this browser. Platform and architecture are not sent to Nexus,
          analytics, or a server.
        </p>
      </div>

      {primaryAsset && manifest?.release && (
        <AssetDetails asset={primaryAsset} manifest={manifest} />
      )}

      <div className={styles.otherPlatforms}>
        <div>
          <p className={styles.eyebrow}>Other platforms</p>
          <h2>Choose a build manually.</h2>
        </div>
        {manifest?.release?.channel === "stable" ? (
          <div className={styles.assetGrid}>
            {manifest.release.assets.map((asset) => (
              <a key={`${asset.platform}-${asset.architecture}-${asset.format}`} href={asset.url}>
                <strong>{platformLabel(asset.platform)} · {architectureLabel(asset.architecture)}</strong>
                <span>{asset.format.toUpperCase()} · {formatAssetSize(asset.sizeBytes)}</span>
                <small>{asset.signing.label}</small>
              </a>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState} data-testid="no-release-state">
            No compatible stable artifacts are published in the versioned manifest.
            <a href={fallbackUrl}> Check GitHub Releases for current status.</a>
          </p>
        )}
      </div>
    </section>
  );
}

function PrimaryAction({
  asset,
  fallbackUrl,
  loading,
  noRelease,
  unsupported,
  choosing,
}: {
  asset: ReleaseAsset | null;
  fallbackUrl: string;
  loading: boolean;
  noRelease: boolean;
  unsupported: boolean;
  choosing: boolean;
}) {
  if (loading) return <button className={styles.primaryButton} disabled>Checking this device…</button>;
  if (asset) {
    return (
      <a
        className={styles.primaryButton}
        data-testid="primary-download"
        download={asset.fileName}
        href={asset.url}
      >
        Download for {platformLabel(asset.platform)} · {architectureLabel(asset.architecture)}
      </a>
    );
  }
  if (choosing) return <button className={styles.primaryButton} disabled>Choose an architecture below</button>;
  return (
    <a className={styles.primaryButton} data-testid="release-fallback" href={fallbackUrl}>
      {unsupported ? "View other platforms" : noRelease ? "View release status" : "Choose an architecture"}
    </a>
  );
}

function ArchitectureChooser({
  architectures,
  onChoose,
}: {
  architectures: DownloadArchitecture[];
  onChoose: (architecture: DownloadArchitecture) => void;
}) {
  return (
    <fieldset className={styles.architectureChooser} data-testid="architecture-chooser">
      <legend>Choose your processor</legend>
      {architectures.map((architecture) => (
        <button key={architecture} type="button" onClick={() => onChoose(architecture)}>
          {architecture === "arm64" ? "Apple Silicon / ARM64" : "Intel / AMD x64"}
        </button>
      ))}
      <small>Check your system information if you are unsure.</small>
    </fieldset>
  );
}

function AssetDetails({ asset, manifest }: { asset: ReleaseAsset; manifest: ReleaseManifest }) {
  if (!manifest.release) return null;
  return (
    <aside className={styles.details} aria-label="Download details">
      <div><span>Version</span><strong>{manifest.release.version}</strong></div>
      <div><span>File</span><strong>{asset.fileName}</strong></div>
      <div><span>Size</span><strong>{formatAssetSize(asset.sizeBytes)}</strong></div>
      <div><span>Security</span><strong data-signing={asset.signing.status}>{asset.signing.label}</strong></div>
      <div className={styles.requirement}><span>Requirements</span><strong>{asset.systemRequirements}</strong></div>
      <div className={styles.checksum}>
        <span>SHA-256</span>
        <code>{asset.sha256}</code>
        <a href={manifest.release.checksumsUrl}>Release checksum file</a>
      </div>
      <div className={styles.instructions}>
        <span>Install</span>
        <ol>{asset.installInstructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol>
      </div>
      <a className={styles.verifyLink} href="/docs#verify-download">Verify this download manually →</a>
    </aside>
  );
}

function primaryHeading(
  asset: ReleaseAsset | null,
  detection: PlatformDetection,
  loading: boolean,
): string {
  if (loading) return "Finding the right Nexus build.";
  if (asset) return `Nexus for ${platformLabel(asset.platform)}.`;
  if (!detection.platform) return "Desktop build unavailable for this device.";
  if (!detection.architecture) return `${platformLabel(detection.platform)} detected. Which processor?`;
  return "No compatible stable build yet.";
}

function primarySummary(
  state: ReturnType<typeof resolveAsset>["state"],
  reason: string,
  manifestError: boolean,
  loading: boolean,
): string {
  if (loading) return "Checking a versioned release manifest without sending device data.";
  if (manifestError) return "The release manifest is unavailable or invalid. GitHub Releases is the safe fallback.";
  if (state === "ready") return "Platform, architecture, and a stable release asset matched with high confidence.";
  if (state === "choose-architecture") return "Architecture is intentionally not guessed when the browser cannot report it reliably.";
  if (state === "unsupported") return reason;
  if (state === "no-release") return "No compatible stable installer is published in the manifest.";
  return "The stable release does not contain a matching asset.";
}
