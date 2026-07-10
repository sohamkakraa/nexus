# Architecture

## Process boundaries

- **Renderer (`src/renderer`)**: React UI in a sandboxed Chromium renderer. It has no Node.js integration and receives a frozen, narrow preload API.
- **Preload (`src/preload`)**: typed IPC bridge only. It does not read Keychain, files, SQLite, or process environment.
- **Main (`src/main`)**: owns BrowserWindow policy, IPC validation, provider SDKs, Keychain access, SQLite, imported files, jobs, MCP clients, and approved local capabilities.
- **Website (`website`)**: static Next.js marketing and documentation routes. It has no desktop API, user account, prompt endpoint, or provider credentials.

Every main-process IPC request must originate from the current main window, its top frame, and the exact packaged renderer file or approved loopback development origin.

## Data flow

1. The user writes a request and selects local attachments in the renderer.
2. Main validates the IPC contract and resolves attachment IDs from local SQLite.
3. Main reads the selected provider key from macOS Keychain.
4. Main sends only the current request and selected context to the chosen provider.
5. Main stores the user and assistant messages locally and broadcasts a new renderer snapshot.

Council mode makes two independent provider requests, requests a concise evidence-oriented critique, and streams an edited answer. It does not request hidden chain-of-thought.

## Local storage

- `data/nexus.sqlite`: conversations, messages, FTS index, attachment metadata, and rolling conversation memory.
- `uploads/`: copied attachments selected by the user.
- `recordings/`: microphone data only when recording is explicitly enabled.
- `skills/`: disabled-by-default declarative skill definitions.
- `preferences/`: retention, personalization, and feedback opt-in settings.
- `diagnostics/`: bounded, redacted operational events without prompt or file content.
- macOS Keychain: OpenAI and Anthropic API keys; excluded from local exports.

## Capability brokers

Commands are parsed without a shell and limited to read-only inspection binaries, safe arguments, an approved real path under the user home directory, a minimal environment, a timeout, and an output cap. System actions and MCP connections/calls require native one-time approval.

Research uses concurrency, tool-call, output-token, and timeout bounds. These reduce accidental spend but are not a monetary guarantee because providers control pricing.

## Releases

CI verifies desktop and website checks, packages an unsigned smoke build without publishing it, scans dependencies and source, and generates an SBOM. The release workflow refuses to build a public artifact unless all Developer ID and Apple notarization credentials are present, validates signatures and stapling, creates checksums and provenance, and prepares a draft prerelease for human publication.
