# Contributing to Nexus

Nexus accepts focused bug fixes, tests, documentation, security hardening, accessibility improvements, and clearly bounded features.

## Start

1. Fork the repository and create a branch.
2. Install desktop dependencies with `npm ci`.
3. Install website dependencies with `npm ci --prefix website`.
4. Run `npm run check`.
5. Open a pull request using the template.

## Requirements

- Never commit API keys, recordings, imported files, local databases, diagnostics, or build output.
- New provider, MCP, CLI, filesystem, accessibility, Apple Event, or update capabilities require a threat-model note.
- Destructive actions must remain blocked by default.
- New telemetry is rejected unless it is opt-in, minimized, documented, inspectable, and erasable.
- AI-generated changes are welcome only when the submitter has reviewed and tested them.
- User-facing changes require keyboard access, visible focus, reduced-motion support, and meaningful error states.

## Commands

```sh
npm run check
npm run test:e2e
npm run package
npm run website:build
npm --prefix website run test:e2e
```

Live provider tests are optional because they spend contributor credits.

## Release policy

Release artifacts are created only from version tags after CI, CodeQL, secret scanning, packaged-app E2E, and checksums succeed. Autonomous agents may propose pull requests, but branch protections and release gates are authoritative.
