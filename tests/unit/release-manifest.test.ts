import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execute = promisify(execFile)

describe('release manifest generation', () => {
  it('generates a stable manifest only from present, checksummed matrix files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'nexus-release-manifest-'))
    const output = join(directory, 'release-manifest.json')
    try {
      for (const platform of ['macos', 'windows', 'linux'] as const) {
        for (const architecture of ['arm64', 'x64'] as const) {
          const assets = []
          for (const [format, extension] of formats(platform)) {
            const os = platform === 'macos' ? 'mac' : platform === 'windows' ? 'win' : 'linux'
            const fileName = `Nexus-1.2.3-${os}-${architecture}.${extension}`
            const content = Buffer.from(`${platform}/${architecture}/${format}`)
            await writeFile(join(directory, fileName), content)
            assets.push({
              fileName,
              format,
              sizeBytes: content.byteLength,
              sha256: createHash('sha256').update(content).digest('hex')
            })
          }
          const status = platform === 'macos' ? 'notarized' : platform === 'windows' ? 'signed' : 'unsigned'
          await writeFile(join(directory, `release-metadata-${platform}-${architecture}.json`), JSON.stringify({
            schemaVersion: 1,
            platform,
            architecture,
            signing: { status, label: `${status} fixture` },
            assets
          }))
        }
      }

      await execute(process.execPath, [
        'scripts/generate-release-manifest.mjs',
        '--artifacts', directory,
        '--output', output,
        '--version', '1.2.3',
        '--channel', 'auto',
        '--published-at', '2026-07-10T12:00:00.000Z'
      ], { cwd: resolve('.') })

      const manifest = JSON.parse(await readFile(output, 'utf8'))
      expect(manifest.release.channel).toBe('stable')
      expect(manifest.release.assets).toHaveLength(12)
      expect(manifest.release.assets[0].url).toMatch(
        /^https:\/\/github\.com\/sohamkakraa\/nexus\/releases\/download\/v1\.2\.3\//
      )
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})

function formats(platform: 'macos' | 'windows' | 'linux'): Array<[string, string]> {
  if (platform === 'macos') return [['dmg', 'dmg'], ['zip', 'zip']]
  if (platform === 'windows') return [['nsis', 'exe'], ['zip', 'zip']]
  return [['appimage', 'AppImage'], ['deb', 'deb']]
}
