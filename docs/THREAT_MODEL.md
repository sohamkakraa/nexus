# Threat model

## Assets

- Provider API keys in macOS Keychain
- Local conversations, memories, attachments, recordings, and personalization notes
- User-approved provider spend
- Files and commands reachable through local capabilities
- MCP credentials, tool arguments, and results
- Release signing identity and update trust

## Trust boundaries

The renderer, model output, imported files, remote content, MCP servers, generated skill definitions, and website visitors are untrusted. The Electron main process, Keychain, local data directory, GitHub security gates, and Apple signing/notarization services are privileged boundaries.

## Primary threats and controls

### Renderer compromise to main-process privilege

Controls: sandbox, context isolation, no Node integration, exact sender/top-frame/origin validation on every IPC handler, strict schemas and size limits, denied navigation/popups/webviews, and restrictive CSP/permissions.

Residual risk: a Chromium or Electron sandbox escape. Dependency updates, CodeQL, review, and least-privilege APIs reduce impact but do not remove platform risk.

### Credential exfiltration

Controls: provider keys exist only in Keychain and main-process memory; they are omitted from snapshots, exports, diagnostics, command environments, and MCP environments. Preview and diagnostic text is redacted.

Residual risk: a compromised main process or provider SDK can access a key while making a request.

### Path traversal and local file exposure

Controls: file selection uses native dialogs, copied filenames use generated IDs, command working directories use canonical real paths and component-aware home containment, and command path arguments cannot be absolute or traverse parents.

Residual risk: content intentionally selected for a provider is disclosed to that provider.

### Arbitrary command or system execution

Controls: no shell, small read-only binary/subcommand allowlist, blocked metacharacters and executable flags, minimal environment, output/time limits, and one-time native approval. Apple Events expose only three validated actions.

Residual risk: allowed tools can read user-approved working-directory content; local Git configuration and repositories remain attacker-controlled inputs.

### Malicious MCP server or tool

Controls: strict connector schema, HTTPS for remote transport, minimal local-process environment, bounded arguments, separate connection and per-tool approval, and redacted previews.

Residual risk: an approved tool can perform whatever its server implements. Users must trust the connector and inspect each request.

### Prompt injection and model error

Controls: tools never run from model claims alone, generated skills start disabled, consequential actions require native approval, and UI/docs instruct users to review output.

Residual risk: persuasive model output may influence a user to approve a harmful action.

### Spend exhaustion

Controls: research concurrency, timeouts, output-token caps, and web-tool-call caps; no autonomous provider jobs or paid marketing spend.

Residual risk: exact cost cannot be guaranteed because provider pricing and internal research behavior can change. Users should configure provider-side budgets and alerts.

### Local data retention

Controls: configurable retention, inspectable personalization, export, delete, restrictive filesystem modes, bounded diagnostics, and no automatic feedback upload.

Residual risk: local malware, backups, filesystem snapshots, or another logged-in user with sufficient OS privileges may access data.

### Supply chain and release substitution

Controls: Dependabot, dependency review, audits, CodeQL, secret scanning, lockfiles, SBOM, checksums, provenance, Developer ID signing, notarization, stapling validation, and draft release review.

Residual risk: compromised maintainers, GitHub Actions dependencies, package registries, signing credentials, or Apple infrastructure.

## Out of scope

- A fully compromised macOS administrator account
- Provider-side security, availability, billing, or retention
- MCP servers and binaries the user explicitly installs and approves
- Formal verification or a third-party security audit

Update this document whenever a change adds provider, network, filesystem, MCP, CLI, system-control, update, telemetry, or release capability.
