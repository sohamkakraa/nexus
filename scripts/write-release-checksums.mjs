import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'

const directory = resolve(process.argv[2] ?? 'release-assets')
const output = resolve(process.argv[3] ?? join(directory, 'SHA256SUMS.txt'))
const publishable = (await listFiles(directory))
  .filter((path) => isPublishable(path) && resolve(path) !== output)
  .sort((left, right) => basename(left).localeCompare(basename(right)))

if (!publishable.length) throw new Error(`No publishable files found in ${directory}.`)

const names = publishable.map(basename)
if (new Set(names).size !== names.length) throw new Error('Release file names must be unique across the build matrix.')

const lines = await Promise.all(publishable.map(async (path) => {
  const digest = createHash('sha256').update(await readFile(path)).digest('hex')
  return `${digest}  ${basename(path)}`
}))
await writeFile(output, `${lines.join('\n')}\n`, 'utf8')
console.log(`Wrote ${lines.length} checksums to ${output}.`)

function isPublishable(path) {
  const name = basename(path)
  if (name.startsWith('release-metadata-')) return false
  return (
    name.endsWith('.dmg')
    || name.endsWith('.zip')
    || name.endsWith('.exe')
    || name.endsWith('.AppImage')
    || name.endsWith('.deb')
    || name === 'release-manifest.json'
    || name.endsWith('-sbom.cdx.json')
  )
}

async function listFiles(folder) {
  const entries = await readdir(folder, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(folder, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  }))
  return nested.flat()
}
