import { readFile, writeFile } from 'node:fs/promises'

const rootPackage = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'))
const webPackage = JSON.parse(await readFile(new URL('../../website/package.json', import.meta.url), 'utf8'))
const date = new Date().toISOString().slice(0, 10)

const report = `# Nexus automated improvement brief — ${date}

This is a deterministic, privacy-safe input for a reviewed improvement agent. It contains repository metadata only—never user conversations, files, recordings, diagnostics, or API keys.

## Current release

- Desktop: ${rootPackage.version}
- Website: ${webPackage.version}
- Node requirement: ${rootPackage.engines?.node ?? 'not declared'}

## Agent mission

Identify **one** small, generalizable improvement with the highest evidence-to-risk ratio.

Prioritize, in order:

1. exploitable security flaws or secret exposure
2. data loss, permission bypasses, and provider/tool correctness
3. failing tests, accessibility, performance, and release reliability
4. frequently requested behavior supported by public issue evidence

## Non-negotiable gates

- Do not use or request private user data.
- Do not add telemetry, cloud storage, arbitrary shell execution, silent tool approvals, or automatic updates.
- Do not merge or release directly.
- Add a threat-model note for provider, network, filesystem, MCP, CLI, system-control, or update capabilities.
- Run \`npm run check\`; add regression tests; open a focused PR with rollback notes.
- If no change clearly improves the project, close the brief with evidence instead of manufacturing work.

## Maintainer checklist

- [ ] Public issue evidence supports the change
- [ ] Diff is narrow and reviewable
- [ ] Security boundaries remain at least as strict
- [ ] CI, secret scan, CodeQL, and E2E pass
- [ ] User-facing behavior and privacy docs match
- [ ] Release can be rolled back
`

await writeFile(process.argv[2] ?? 'evolution-report.md', report)
