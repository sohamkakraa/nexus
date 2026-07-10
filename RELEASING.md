# Releasing Nexus Desktop

## Current status

The current local artifact is a macOS arm64 `Nexus.app`. No DMG or public
cross-platform installer has been produced from this branch. The committed
website manifest therefore has `"release": null`, and the website falls back to
GitHub Releases.

## Release contract

Desktop publication runs only for an annotated, GitHub-verified signed tag whose
name exactly matches `v` plus the version in `package.json` (for example,
`v0.2.0`). The workflow first runs desktop and website lint, type checks, unit
tests, production builds, manifest validation, and browser download-routing E2E.

The build matrix uses native GitHub-hosted runners:

| Platform | Architectures | Outputs |
| --- | --- | --- |
| macOS | arm64, x64 | DMG, ZIP |
| Windows | arm64, x64 | NSIS, ZIP |
| Linux | arm64, x64 | AppImage, deb |

Artifact names use `Nexus-<version>-<electron-builder-os>-<arch>.<extension>`.
Each matrix entry records size, SHA-256, and signing status. The assembly job
generates a CycloneDX SBOM, `SHA256SUMS.txt`, a schema-validated
`release-manifest.json`, and GitHub build-provenance attestations where the
repository plan supports attestations.

## Signing secrets

Secrets are configured in GitHub repository or environment settings and must
never be committed:

- `MACOS_CERTIFICATE`: Electron Builder-compatible Developer ID certificate
  content or link
- `MACOS_CERTIFICATE_PASSWORD`: certificate password
- `APPLE_API_KEY_BASE64`: base64-encoded App Store Connect `.p8` key
- `APPLE_API_KEY_ID`: App Store Connect key ID
- `APPLE_API_ISSUER`: App Store Connect issuer ID
- `WINDOWS_CERTIFICATE`: Electron Builder-compatible Authenticode certificate
  content or link
- `WINDOWS_CERTIFICATE_PASSWORD`: certificate password

The workflow verifies the resulting macOS app with `codesign`, validates the
notarization staple for each DMG, and checks Windows installers with
`Get-AuthenticodeSignature`.

If macOS Developer ID/notarization or Windows Authenticode credentials are
absent, the workflow still builds diagnostic candidates and labels their
metadata `unsigned` or `not notarized`. Those files are retained as short-lived
GitHub Actions artifacts only. They are **not** published to GitHub Releases.
Linux files are distributed with SHA-256 and provenance rather than a platform
code-signing identity.

## Website manifest

`release/release-manifest.schema.json` is the authoritative JSON Schema.
`website/public/release-manifest.json` is the same-origin static manifest read
by the browser. The website does not call a detection API and does not send
User-Agent Client Hints to analytics or a server.

The assembly job creates a release manifest from files that actually exist; it
does not predict URLs. A stable manifest is rejected unless both macOS
architectures are notarized and both Windows architectures are signed. Until a
generated stable manifest is reviewed and committed to
`website/public/release-manifest.json`, the website safely links to the GitHub
releases page.

Validate any manifest update before merging:

```sh
npm run manifest:validate
npm test
npm run website:typecheck
npm run website:build
npm run test:website:e2e
```

## Creating a tag

After the release commit is reviewed and branch protection is green:

```sh
git tag -s v0.2.0 -m "Nexus v0.2.0"
git push origin v0.2.0
```

Do not use a lightweight or unsigned tag. Do not use Electron Builder's
`--publish` option locally. GitHub Releases is the only automated publication
path.
