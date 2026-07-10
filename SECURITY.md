# Security policy

## Supported versions

Security fixes are applied to the latest release and the `main` branch.

## Reporting a vulnerability

Do not open a public issue for an exploitable vulnerability.

Use [GitHub private vulnerability reporting](https://github.com/sohamkakraa/nexus/security/advisories/new). Include:

- affected version and macOS version
- impact and realistic attack scenario
- minimal reproduction
- whether API keys, local files, IPC, MCP, shell commands, Apple Events, or updates are involved
- suggested mitigation, if known

You should receive acknowledgement within 72 hours. We will coordinate disclosure after a fix is available.

## Security boundaries

- Provider keys are stored in macOS Keychain and owned by the Electron main process.
- The renderer is sandboxed, context-isolated, and has no Node integration.
- IPC validates the sender, top frame, trusted renderer URL, and input schema.
- Shell commands are parsed and executed without a shell.
- MCP and macOS actions require visible approval.
- Diagnostics redact provider-key patterns and exclude prompts/files.
- The website is static and must never handle provider API keys.

See the [architecture](docs/ARCHITECTURE.md), [threat model](docs/THREAT_MODEL.md), and public explanation at [nexus.sohamkakra.com/security](https://nexus.sohamkakra.com/security).
