import type { PlatformCapabilities } from '../shared/contracts'

export function platformCapabilities(
  platform = process.platform,
  architecture = process.arch
): PlatformCapabilities {
  const os = platform === 'darwin' ? 'macos' : platform === 'win32' ? 'windows' : 'linux'
  const credentialStore = platform === 'darwin'
    ? 'macOS Keychain'
    : platform === 'win32'
      ? 'Windows Credential Manager'
      : 'Linux Secret Service'
  return {
    os,
    architecture: architecture === 'arm64' || architecture === 'x64' ? architecture : 'other',
    credentialStore,
    systemControls: platform === 'darwin',
    systemControlsMessage: platform === 'darwin'
      ? 'Apple Events are available with approval for every action.'
      : 'Apple Event system controls are available only on macOS. Read-only command tools remain available.'
  }
}
