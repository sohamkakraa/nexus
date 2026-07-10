import { describe, expect, it } from 'vitest'
import { platformCapabilities } from '../../src/main/platform'

describe('desktop platform capabilities', () => {
  it('enables Apple Event controls only on macOS', () => {
    expect(platformCapabilities('darwin', 'arm64')).toMatchObject({
      os: 'macos',
      architecture: 'arm64',
      credentialStore: 'macOS Keychain',
      systemControls: true
    })
    expect(platformCapabilities('win32', 'x64')).toMatchObject({
      os: 'windows',
      credentialStore: 'Windows Credential Manager',
      systemControls: false
    })
    expect(platformCapabilities('linux', 'arm64')).toMatchObject({
      os: 'linux',
      credentialStore: 'Linux Secret Service',
      systemControls: false
    })
  })

  it('does not claim an unsupported processor architecture', () => {
    expect(platformCapabilities('linux', 'riscv64').architecture).toBe('other')
  })
})
