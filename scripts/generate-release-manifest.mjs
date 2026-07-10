import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const options = parseOptions(process.argv.slice(2))
const artifactDirectory = resolve(required(options, 'artifacts'))
const outputPath = resolve(required(options, 'output'))
const version = required(options, 'version').replace(/^v/, '')
const tag = `v${version}`
const requestedChannel = required(options, 'channel')
const publishedAt = options['published-at'] ?? new Date().toISOString()
const repository = options.repository ?? 'sohamkakraa/nexus'

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error(`Invalid version: ${version}`)
if (!['auto', 'stable', 'prerelease'].includes(requestedChannel)) throw new Error(`Invalid release channel: ${requestedChannel}`)
if (repository !== 'sohamkakraa/nexus') throw new Error('The website manifest is restricted to sohamkakraa/nexus.')
if (!Number.isFinite(Date.parse(publishedAt))) throw new Error(`Invalid publication timestamp: ${publishedAt}`)

const artifactPaths = await listFiles(artifactDirectory)
const metadataPaths = artifactPaths
  .filter((path) => /^release-metadata-(macos|windows|linux)-(arm64|x64)\.json$/.test(basename(path)))
  .sort()
if (metadataPaths.length !== 6) throw new Error(`Expected six platform metadata files, found ${metadataPaths.length}.`)

const metadata = await Promise.all(metadataPaths.map(async (path) => JSON.parse(await readFile(path, 'utf8'))))
assertCompleteMatrix(metadata)
await assertArtifactFiles(metadata, artifactPaths)
const channel = requestedChannel === 'auto'
  ? automaticChannel(version, metadata)
  : requestedChannel
if (channel === 'stable') assertStableSigning(metadata)

const releaseRoot = `https://github.com/${repository}/releases`
const downloadRoot = `${releaseRoot}/download/${tag}`
const assets = metadata.flatMap((entry) => entry.assets.map((asset) => ({
  platform: entry.platform,
  architecture: entry.architecture,
  format: asset.format,
  fileName: asset.fileName,
  url: `${downloadRoot}/${encodeURIComponent(asset.fileName)}`,
  sizeBytes: asset.sizeBytes,
  sha256: asset.sha256,
  systemRequirements: systemRequirements(entry.platform, entry.architecture, asset.format),
  installInstructions: installInstructions(entry.platform, asset.format),
  signing: entry.signing
}))).sort((left, right) =>
  `${left.platform}-${left.architecture}-${left.format}`.localeCompare(`${right.platform}-${right.architecture}-${right.format}`)
)

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  fallbackUrl: releaseRoot,
  release: {
    version,
    channel,
    publishedAt,
    releaseUrl: `${releaseRoot}/tag/${tag}`,
    checksumsUrl: `${downloadRoot}/SHA256SUMS.txt`,
    assets
  }
}

await validateManifest(manifest)
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`Generated ${channel} release manifest with ${assets.length} assets at ${outputPath}.`)

function assertCompleteMatrix(entries) {
  const combinations = new Set(entries.map((entry) => `${entry.platform}/${entry.architecture}`))
  for (const platform of ['macos', 'windows', 'linux']) {
    for (const architecture of ['arm64', 'x64']) {
      if (!combinations.has(`${platform}/${architecture}`)) throw new Error(`Missing metadata for ${platform}/${architecture}.`)
    }
  }
  for (const entry of entries) {
    if (!Array.isArray(entry.assets) || entry.assets.length < 2) throw new Error(`Incomplete assets for ${entry.platform}/${entry.architecture}.`)
    if (!entry.signing || !['notarized', 'signed', 'unsigned'].includes(entry.signing.status)) {
      throw new Error(`Invalid signing metadata for ${entry.platform}/${entry.architecture}.`)
    }
    for (const asset of entry.assets) {
      if (
        typeof asset.fileName !== 'string'
        || !Number.isSafeInteger(asset.sizeBytes)
        || asset.sizeBytes < 1
        || typeof asset.sha256 !== 'string'
        || !/^[a-f0-9]{64}$/.test(asset.sha256)
      ) throw new Error(`Invalid artifact metadata in ${entry.platform}/${entry.architecture}.`)
    }
  }
}

function assertStableSigning(entries) {
  for (const entry of entries) {
    if (entry.platform === 'macos' && entry.signing.status !== 'notarized') {
      throw new Error(`Stable macOS artifact ${entry.architecture} is not notarized.`)
    }
    if (entry.platform === 'windows' && entry.signing.status !== 'signed') {
      throw new Error(`Stable Windows artifact ${entry.architecture} is not signed.`)
    }
  }
}

async function assertArtifactFiles(entries, files) {
  const byName = new Map(files.map((path) => [basename(path), path]))
  for (const entry of entries) {
    for (const asset of entry.assets) {
      const path = byName.get(asset.fileName)
      if (!path) throw new Error(`Metadata references a missing artifact: ${asset.fileName}`)
      const content = await readFile(path)
      if (content.byteLength !== asset.sizeBytes) throw new Error(`Size mismatch for ${asset.fileName}.`)
      const digest = createHash('sha256').update(content).digest('hex')
      if (digest !== asset.sha256) throw new Error(`SHA-256 mismatch for ${asset.fileName}.`)
    }
  }
}

function automaticChannel(releaseVersion, entries) {
  if (releaseVersion.includes('-')) return 'prerelease'
  const distributableSigningReady = entries.every((entry) => {
    if (entry.platform === 'macos') return entry.signing.status === 'notarized'
    if (entry.platform === 'windows') return entry.signing.status === 'signed'
    return true
  })
  return distributableSigningReady ? 'stable' : 'prerelease'
}

function systemRequirements(platform, architecture, format) {
  if (platform === 'macos') return `macOS 14 or later; ${architecture === 'arm64' ? 'Apple Silicon' : 'Intel'} Mac.`
  if (platform === 'windows') {
    return `${architecture === 'arm64' ? 'Windows 11 on ARM' : '64-bit Windows 10 or later'}; 4 GB RAM recommended.`
  }
  const formatRequirement = format === 'appimage' ? 'FUSE 2 or AppImage extract mode' : 'a Debian-compatible package manager'
  return `64-bit ${architecture === 'arm64' ? 'ARM64' : 'x64'} Linux; ${formatRequirement}; Secret Service-compatible keyring.`
}

function installInstructions(platform, format) {
  if (platform === 'macos' && format === 'dmg') return ['Open the DMG.', 'Drag Nexus to Applications.', 'Open Nexus and review the macOS security prompt.']
  if (platform === 'macos') return ['Extract the ZIP.', 'Move Nexus.app to Applications.', 'Open Nexus and review the macOS security prompt.']
  if (platform === 'windows' && format === 'nsis') return ['Run the NSIS installer.', 'Review the publisher status shown by Windows.', 'Launch Nexus from the Start menu.']
  if (platform === 'windows') return ['Extract the ZIP to a folder you control.', 'Run Nexus.exe.', 'Review the publisher status shown by Windows.']
  if (format === 'appimage') return ['Make the AppImage executable.', 'Run it from your file manager or terminal.', 'Ensure a Secret Service-compatible keyring is available.']
  return ['Verify the checksum.', 'Install the package with your distribution package manager.', 'Launch Nexus from the application menu.']
}

async function validateManifest(manifestValue) {
  const schema = JSON.parse(await readFile(resolve('release/release-manifest.schema.json'), 'utf8'))
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  addFormats(ajv)
  const validate = ajv.compile(schema)
  if (!validate(manifestValue)) {
    throw new Error(`Generated manifest is invalid:\n${JSON.stringify(validate.errors, null, 2)}`)
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  }))
  return nested.flat()
}

function parseOptions(args) {
  const parsed = {}
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]?.replace(/^--/, '')
    const value = args[index + 1]
    if (!key || value === undefined) throw new Error(`Invalid argument near ${args[index] ?? '<end>'}`)
    parsed[key] = value
  }
  return parsed
}

function required(optionsValue, key) {
  const value = optionsValue[key]
  if (!value) throw new Error(`Missing --${key}`)
  return value
}
