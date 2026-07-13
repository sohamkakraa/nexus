export function messageOf(reason: unknown): string {
  return (reason instanceof Error ? reason.message : String(reason))
    .replace(/^Error invoking remote method '[^']+':\s*/, '')
    .replace(/^(?:ProviderConnectionError|Error):\s*/, '')
}
