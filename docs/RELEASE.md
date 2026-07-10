# Release process

## Current blocker

No production installer can be published until the repository has these GitHub Actions secrets:

- `CSC_LINK`: encrypted Developer ID Application certificate
- `CSC_KEY_PASSWORD`: certificate password
- `APPLE_ID`: Apple account used for notarization
- `APPLE_APP_SPECIFIC_PASSWORD`: app-specific password
- `APPLE_TEAM_ID`: Apple Developer team identifier

The release workflow exits before packaging when any value is absent. CI may create an unsigned directory build for smoke testing, but it never uploads that build as a release.

## Prepare

1. Update the version, `CHANGELOG.md`, website changelog, and supported-platform notes.
2. Run desktop lint, typecheck, unit tests, Electron E2E, production build, and package smoke check.
3. Run website lint, typecheck, production build, accessibility smoke, responsive checks, and performance guardrails.
4. Confirm dependency audits, dependency review, CodeQL, secret scan, SBOM, and threat-model changes.
5. Confirm no local app data, build output, credentials, or generated diagnostics are tracked.

## Build and verify

Push a signed version tag only after `main` is green. The workflow:

1. requires all signing/notary secrets;
2. builds arm64 DMG and ZIP artifacts;
3. verifies the app code signature and Gatekeeper assessment;
4. validates notarization stapling and DMG assessment;
5. creates SHA-256 checksums, CycloneDX SBOM, and GitHub build provenance;
6. uploads everything to a **draft prerelease**.

A maintainer manually verifies installation on a clean supported Mac, compares checksums, reviews release notes, and publishes the draft. Automatic agents may not publish, bypass checks, retag, or force-push a release.

## Rollback

Mark a bad release as withdrawn, document the reason, restore the last verified release as recommended, and ship a new version. Do not replace artifacts under an existing tag.
