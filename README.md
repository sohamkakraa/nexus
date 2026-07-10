# Nexus

> Two AI models. One considered answer.

[Website](https://nexus.sohamkakra.com) · [Documentation](https://nexus.sohamkakra.com/docs) · [Security](SECURITY.md) · [Architecture](docs/ARCHITECTURE.md) · [Contributing](CONTRIBUTING.md)

Nexus is a free, open-source, local-first macOS AI workspace that lets OpenAI and Anthropic models work independently, review concrete disagreements, and return one useful answer.

The project is an early public beta. Until a notarized release is published, build from source rather than downloading artifacts from untrusted mirrors.

## Included

- Keychain-backed bring-your-own-key setup and account model discovery
- Solo and Council conversations with streaming final answers and clarification requests
- Local SQLite history, FTS retrieval, and bounded rolling memory
- Up to 10 safe attachments per turn, including images, PDFs, Office documents, code, text, and audio
- Image generation, realtime voice calls, opt-in recordings, and timestamp-ready transcripts
- Quick, deep, and automatic web research as concurrent cancellable jobs
- Remote HTTPS and local stdio MCP clients, declarative generated skills, and a task tray
- Explicit approval before connector writes, CLI commands, or macOS system actions

## Development

Requirements: macOS, Node.js 22 or newer, and npm.

```sh
npm install
npm run dev
```

The Cursor environment may define `ELECTRON_RUN_AS_NODE=1`; if so, start with:

```sh
env -u ELECTRON_RUN_AS_NODE npm run dev
```

Verification:

```sh
npm run check
npm run test:e2e
npm run package
```

Marketing site:

```sh
npm install --prefix website
npm run website:build
npm run site:dev
```

Live provider checks are intentionally not part of the default test suite because they require personal keys and spend API credits.

## Privacy and permissions

API keys are stored in macOS Keychain. Chats, files, generated images, recordings, skills, permissions, and diagnostics remain under Electron's local application-data directory. Sensitive values are redacted from diagnostics, and prompt/file contents are not logged.

Nexus does not run arbitrary shell strings. It parses a small executable allowlist without a shell, blocks chaining and destructive flags, applies timeouts and output limits, and asks for approval. MCP tools also require per-call approval. Generated skills are inert JSON instructions until reviewed.

Local personalization and feedback sharing are off by default. Personalization notes remain local and can be deleted. Feedback is exported as a reviewed JSON file; Nexus never uploads it automatically and excludes conversations, prompts, responses, file names, and file contents by default.

Read [SECURITY.md](SECURITY.md) before adding network, provider, filesystem, MCP, CLI, Apple Event, accessibility, or update capabilities.

Project references: [threat model](docs/THREAT_MODEL.md) · [safe automation](docs/AUTOMATION.md) · [release process](docs/RELEASE.md) · [changelog](CHANGELOG.md) · [support](SUPPORT.md)

## Model names

Nexus discovers models available to the connected API account and classifies their capabilities. Product names such as `gpt-image-2`, `gpt-live-1`, or `gpt-whisper` are not assumed to exist; the UI presents the account-supported image, realtime, and transcription models, with `whisper-1` used only as a transcription fallback.
