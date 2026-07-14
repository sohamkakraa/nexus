import { dialog } from 'electron'
import { execFile } from 'node:child_process'
import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'
import { promisify } from 'node:util'

const execute = promisify(execFile)
const MAX_FILES = 300
const MAX_DEPTH = 5
const MAX_CONTEXT = 80_000
const SKIP_DIRECTORIES = new Set([
  '.git', '.next', '.turbo', '.venv', 'build', 'coverage', 'dist', 'node_modules',
  'out', 'target', 'vendor'
])
const CONTEXT_FILES = new Set([
  'README.md', 'README.txt', 'AGENTS.md', 'package.json', 'pyproject.toml',
  'Cargo.toml', 'go.mod', 'Gemfile', 'composer.json', 'pom.xml', 'build.gradle'
])

export async function selectWorkspaceDirectory(): Promise<{ path: string; name: string } | null> {
  const selected = await dialog.showOpenDialog({
    title: 'Connect a folder or repository',
    buttonLabel: 'Connect folder',
    properties: ['openDirectory', 'createDirectory']
  })
  if (selected.canceled || !selected.filePaths[0]) return null
  const path = await realpath(selected.filePaths[0])
  if (!(await stat(path)).isDirectory()) throw new Error('Choose a folder or repository.')
  return { path, name: basename(path) || path }
}

export async function workspaceContext(path: string | undefined): Promise<string> {
  if (!path) return ''
  let root: string
  try {
    root = await realpath(path)
    if (!(await stat(root)).isDirectory()) return ''
  } catch {
    return ''
  }

  const files: string[] = []
  await collectFiles(root, root, 0, files)
  const contextSections = await Promise.all(
    files
      .filter((file) => CONTEXT_FILES.has(basename(file)))
      .slice(0, 8)
      .map(async (file) => {
        try {
          const content = (await readFile(file, 'utf8')).slice(0, 20_000)
          return `File: ${relative(root, file)}\n${content}`
        } catch {
          return ''
        }
      })
  )
  const gitStatus = await repositoryStatus(root)
  return [
    `Connected local workspace: ${basename(root)}`,
    `Visible file tree (${files.length} files, bounded):\n${files.map((file) => relative(root, file)).join('\n')}`,
    gitStatus ? `Git status:\n${gitStatus}` : '',
    ...contextSections
  ].filter(Boolean).join('\n\n').slice(0, MAX_CONTEXT)
}

async function collectFiles(root: string, directory: string, depth: number, files: string[]): Promise<void> {
  if (depth > MAX_DEPTH || files.length >= MAX_FILES) return
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    if (files.length >= MAX_FILES) return
    if (isSensitiveName(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) await collectFiles(root, path, depth + 1, files)
    } else if (entry.isFile()) {
      files.push(path)
    }
  }
}

function isSensitiveName(name: string): boolean {
  const lower = name.toLowerCase()
  return (
    (name.startsWith('.') && name !== '.github')
    || lower.includes('credential')
    || lower.includes('secret')
    || lower === 'id_rsa'
    || lower === 'id_ed25519'
    || /^\.?env(?:\.|$)/.test(lower)
  )
}

async function repositoryStatus(root: string): Promise<string> {
  try {
    const result = await execute('git', ['status', '--short', '--branch'], {
      cwd: root,
      timeout: 5_000,
      maxBuffer: 256_000,
      env: {
        HOME: process.env.HOME,
        PATH: process.env.PATH,
        LANG: process.env.LANG
      }
    })
    return result.stdout.trim().slice(0, 20_000)
  } catch {
    return ''
  }
}
