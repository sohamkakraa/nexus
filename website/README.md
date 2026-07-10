# Nexus website

Static marketing, documentation, security, privacy, legal, community, and changelog routes for `nexus.sohamkakra.com`.

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

The site has no prompt API, provider secrets, authentication, analytics SDK, or client API keys. Production metadata is canonical to `https://nexus.sohamkakra.com`.
