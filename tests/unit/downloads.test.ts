import { describe, expect, it } from 'vitest'
import {
  detectPlatform,
  parseReleaseManifest,
  resolveAsset,
  type DownloadArchitecture,
  type DownloadFormat,
  type DownloadPlatform,
  type PlatformDetection,
  type ReleaseAsset,
  type ReleaseManifest
} from '../../website/src/lib/downloads'

describe('local platform detection', () => {
  it.each([
    ['macOS Apple Silicon', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)', { platform: 'macOS', architecture: 'arm', bitness: '64' }, 'macos', 'arm64'],
    ['macOS Intel', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)', { platform: 'macOS', architecture: 'x86', bitness: '64' }, 'macos', 'x64'],
    ['Windows ARM64', 'Mozilla/5.0 (Windows NT 10.0; Win64; ARM64)', { platform: 'Windows', architecture: 'arm', bitness: '64' }, 'windows', 'arm64'],
    ['Windows x64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', { platform: 'Windows', architecture: 'x86', bitness: '64' }, 'windows', 'x64'],
    ['Linux ARM64', 'Mozilla/5.0 (X11; Linux aarch64)', { platform: 'Linux', architecture: 'arm', bitness: '64' }, 'linux', 'arm64'],
    ['Linux x64', 'Mozilla/5.0 (X11; Linux x86_64)', { platform: 'Linux', architecture: 'x86', bitness: '64' }, 'linux', 'x64']
  ])('detects %s from high-entropy hints', (_label, userAgent, hints, platform, architecture) => {
    expect(detectPlatform({ userAgent, hints })).toMatchObject({
      platform,
      architecture,
      confidence: 'confident',
      source: 'client-hints'
    })
  })

  it('does not mistake the generic macOS Intel UA token for an Intel processor', () => {
    expect(detectPlatform({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15'
    })).toMatchObject({
      platform: 'macos',
      architecture: null,
      confidence: 'ambiguous'
    })
  })

  it.each([
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'windows', 'x64'],
    ['Mozilla/5.0 (X11; Linux x86_64)', 'linux', 'x64'],
    ['Mozilla/5.0 (X11; Linux aarch64)', 'linux', 'arm64']
  ])('uses explicit architecture tokens in UA fallback', (userAgent, platform, architecture) => {
    expect(detectPlatform({ userAgent })).toMatchObject({ platform, architecture, confidence: 'confident' })
  })

  it.each([
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    'Mozilla/5.0 (Linux; Android 15; Pixel 9)',
    'Mozilla/5.0 (CrOS x86_64 16000.0.0)'
  ])('treats unsupported clients as unsupported', (userAgent) => {
    expect(detectPlatform({ userAgent })).toMatchObject({ platform: null, confidence: 'unsupported' })
  })
})

describe('release asset resolution', () => {
  it.each([
    ['macos', 'arm64', 'dmg'],
    ['macos', 'x64', 'dmg'],
    ['windows', 'arm64', 'nsis'],
    ['windows', 'x64', 'nsis'],
    ['linux', 'arm64', 'appimage'],
    ['linux', 'x64', 'appimage']
  ] as const)('selects the preferred %s %s artifact', (platform, architecture, format) => {
    const resolution = resolveAsset(stableManifest(), confident(platform, architecture))
    expect(resolution).toMatchObject({ state: 'ready', asset: { platform, architecture, format } })
  })

  it('requests an architecture choice instead of guessing', () => {
    const resolution = resolveAsset(stableManifest(), {
      platform: 'macos',
      architecture: null,
      confidence: 'ambiguous',
      source: 'user-agent',
      reason: 'ambiguous'
    })
    expect(resolution).toEqual({ state: 'choose-architecture', architectures: ['arm64', 'x64'] })
  })

  it('never routes a prerelease or empty manifest as a stable download', () => {
    const prerelease = stableManifest()
    if (prerelease.release) prerelease.release.channel = 'prerelease'
    expect(resolveAsset(prerelease, confident('macos', 'arm64'))).toEqual({ state: 'no-release' })
    expect(resolveAsset({ ...prerelease, release: null }, confident('macos', 'arm64'))).toEqual({ state: 'no-release' })
  })

  it('rejects manifests that point outside the Nexus GitHub release path', () => {
    const manifest = stableManifest() as unknown as Record<string, unknown>
    const release = manifest.release as Record<string, unknown>
    const assets = release.assets as Array<Record<string, unknown>>
    assets[0].url = 'https://downloads.example/Nexus.dmg'
    expect(parseReleaseManifest(manifest)).toBeNull()
  })
})

function stableManifest(): ReleaseManifest {
  const assets: ReleaseAsset[] = []
  for (const platform of ['macos', 'windows', 'linux'] as DownloadPlatform[]) {
    for (const architecture of ['arm64', 'x64'] as DownloadArchitecture[]) {
      for (const format of formats(platform)) assets.push(asset(platform, architecture, format))
    }
  }
  return {
    schemaVersion: 1,
    generatedAt: '2026-07-10T12:00:00.000Z',
    fallbackUrl: 'https://github.com/sohamkakraa/nexus/releases',
    release: {
      version: '1.2.3',
      channel: 'stable',
      publishedAt: '2026-07-10T12:00:00.000Z',
      releaseUrl: 'https://github.com/sohamkakraa/nexus/releases/tag/v1.2.3',
      checksumsUrl: 'https://github.com/sohamkakraa/nexus/releases/download/v1.2.3/SHA256SUMS.txt',
      assets
    }
  }
}

function asset(
  platform: DownloadPlatform,
  architecture: DownloadArchitecture,
  format: DownloadFormat
): ReleaseAsset {
  const extension = format === 'nsis' ? 'exe' : format === 'appimage' ? 'AppImage' : format
  const fileName = `Nexus-1.2.3-${platform}-${architecture}.${extension}`
  return {
    platform,
    architecture,
    format,
    fileName,
    url: `https://github.com/sohamkakraa/nexus/releases/download/v1.2.3/${fileName}`,
    sizeBytes: 100_000_000,
    sha256: 'a'.repeat(64),
    systemRequirements: 'Supported desktop operating system',
    installInstructions: ['Download and open the package.'],
    signing: { status: 'signed', label: 'Signed test fixture' }
  }
}

function formats(platform: DownloadPlatform): DownloadFormat[] {
  if (platform === 'macos') return ['dmg', 'zip']
  if (platform === 'windows') return ['nsis', 'zip']
  return ['appimage', 'deb']
}

function confident(platform: DownloadPlatform, architecture: DownloadArchitecture): PlatformDetection {
  return {
    platform,
    architecture,
    confidence: 'confident',
    source: 'client-hints',
    reason: 'fixture'
  }
}
