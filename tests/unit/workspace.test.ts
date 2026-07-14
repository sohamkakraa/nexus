import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

vi.mock('electron', () => ({
  dialog: { showOpenDialog: vi.fn() }
}))

import { workspaceContext } from '../../src/main/workspace'

const temporaryPaths: string[] = []

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('connected workspace context', () => {
  it('includes bounded project structure while excluding secrets and generated directories', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nexus-workspace-'))
    temporaryPaths.push(root)
    await mkdir(join(root, 'src'))
    await mkdir(join(root, 'node_modules'))
    await writeFile(join(root, 'README.md'), '# Example repository\nUseful context.')
    await writeFile(join(root, 'package.json'), '{"name":"example"}')
    await writeFile(join(root, '.env'), 'SECRET=must-not-appear')
    await writeFile(join(root, 'src', 'index.ts'), 'export const answer = 42')
    await writeFile(join(root, 'node_modules', 'ignored.js'), 'ignored')

    const context = await workspaceContext(root)

    expect(context).toContain('README.md')
    expect(context).toContain('src/index.ts')
    expect(context).toContain('Useful context.')
    expect(context).not.toContain('.env')
    expect(context).not.toContain('must-not-appear')
    expect(context).not.toContain('node_modules')
  })
})
