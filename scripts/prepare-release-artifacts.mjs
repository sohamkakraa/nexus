import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'

const options = parseOptions(process.argv.slice(2))
const platform = required(options, 'platform')
const architecture = required(options, 'arch')
const signingStatus = required(options, 'signing-status')
const signingLabel = required(options, 'signing-label')
const distDirectory = resolve(options.dist ?? 'dist')
const outputDirectory = resolve(options.out ?? 'release-assets')
const platformToken = platform === 'macos' ? 'mac' : platform === 'windows' ? 'win' : 'linux'

if (!['macos', 'windows', 'linux'].includes(platform)) throw new Error(`Unsupported platform: ${platform}`)
if (!['arm64', 'x64'].includes(architecture)) throw new Error(`Unsupported architecture: ${architecture}`)
if (!['notarized', 'signed', 'unsigned'].includes(signingStatus)) throw new Error(`Unsupported signing status: ${signingStatus}`)

const candidates = (await listFiles(distDirectory))
  .filter((path) => isExpectedArtifact(basename(path), platformToken, architecture, platform))
  .sort()

const expectedFormats = platform === 'macos'
  ? ['dmg', 'zip']
  : platform === 'windows'
    ? ['nsis', 'zip']
    : ['appimage', 'deb']
const formats = candidates.map((path) => formatFromFile(path, platform))
for (const expected of expectedFormats) {
  if (!formats.includes(expected)) throw new Error(`Missing ${platform}/${architecture} ${expected} artifact in ${distDirectory}`)
}

await mkdir(outputDirectory, { recursive: true })
const assets = []
for (const source of candidates) {
  const fileName = basename(source)
  const destination = join(outputDirectory, fileName)
  await copyFile(source, destination)
  const file = await readFile(destination)
  const sizeBytes = (await stat(destination)).size
  assets.push({
    fileName,
    format: formatFromFile(fileName, platform),
    sizeBytes,
    sha256: createHash('sha256').update(file).digest('hex')
  })
}

const metadata = {
  schemaVersion: 1,
  platform,
  architecture,
  signing: {
    status: signingStatus,
    label: signingLabel
  },
  assets
}
await writeFile(
  join(outputDirectory, `release-metadata-${platform}-${architecture}.json`),
  `${JSON.stringify(metadata, null, 2)}\n`,
  'utf8'
)

console.log(`Prepared ${assets.length} ${platform}/${architecture} release artifacts.`)

function isExpectedArtifact(fileName, os, arch, targetPlatform) {
  if (!fileName.includes(`-${os}-${arch}.`) && !fileName.includes(`-${os}-${arch}-`)) return false
  if (targetPlatform === 'macos') return fileName.endsWith('.dmg') || fileName.endsWith('.zip')
  if (targetPlatform === 'windows') return fileName.endsWith('.exe') || fileName.endsWith('.zip')
  return fileName.endsWith('.AppImage') || fileName.endsWith('.deb')
}

function formatFromFile(path, targetPlatform) {
  if (path.endsWith('.dmg')) return 'dmg'
  if (path.endsWith('.AppImage')) return 'appimage'
  if (path.endsWith('.deb')) return 'deb'
  if (path.endsWith('.exe') && targetPlatform === 'windows') return 'nsis'
  if (path.endsWith('.zip')) return 'zip'
  throw new Error(`Unsupported artifact format: ${path}`)
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
