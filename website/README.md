# Nexus website

Static marketing, documentation, security, privacy, legal, community, changelog,
and architecture-aware desktop download routes for `nexus.sohamkakra.com`.

## Development

```sh
npm ci
npm run dev
```

## Verification

```sh
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Run manifest and download-routing checks from the repository root:

```sh
npm run manifest:validate
npm run test:website:e2e
```

The browser reads only `/release-manifest.json`. Platform and architecture
detection happens locally and is not posted to a detection endpoint or analytics.
The site has no prompt API, provider secrets, authentication, analytics SDK, or
client API keys. Production metadata is canonical to
`https://nexus.sohamkakra.com`.
