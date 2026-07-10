# Nexus social launch kit

## Launch post

Most AI apps ask you to trust one model.

Nexus lets OpenAI and Anthropic draft independently, challenge weak assumptions, and return one considered answer.

- local-first macOS app
- your API keys in macOS Keychain
- files, research, voice, MCP, and approved local tools
- free and MIT licensed

Source and security model: https://nexus.sohamkakra.com

## Short post

Don’t ask one AI. Convene a council.

Nexus is a free, open-source macOS workspace where OpenAI and Anthropic propose, critique, and answer together—using your own API keys.

https://nexus.sohamkakra.com

## Technical post

We open-sourced Nexus’s security boundary:

Renderer: sandboxed, context-isolated, no Node access  
Keys: macOS Keychain, main process only  
CLI: parsed without a shell  
MCP/macOS actions: visible one-time approval  
History: local SQLite  
Website: static, zero provider secrets

Audit it: https://nexus.sohamkakra.com/security

## Community post

We’re looking for contributors who care about:

- macOS accessibility
- Electron security
- model-provider correctness
- MCP safety
- reproducible signed releases
- research citation quality

Good-first issues and contribution guide: https://github.com/sohamkakraa/nexus

## Show HN draft

**Title:** Show HN: Nexus – open-source macOS app where OpenAI and Anthropic critique each other

I built Nexus because switching model tabs still leaves the synthesis work to the user. In Council mode, two providers receive the same brief, prepare independent proposals, compare concrete conflicts, and produce one answer that preserves material disagreement.

Nexus is local-first and bring-your-own-key. Keys live in macOS Keychain, history uses local SQLite, and tool or system actions require native approval. The renderer has no Node access. The source, security model, tests, and release checksums are public.

It also supports files, image generation, realtime voice, transcription, cited research, MCP, and a narrow local capability broker.

I’d especially value feedback on the Council protocol, Electron boundary, and reproducible macOS packaging.

## Product Hunt

**Tagline:** Two AI models. One considered answer.

**Description:** Nexus is a free, open-source AI workspace for macOS. Connect your own OpenAI and Anthropic API keys, then let both models draft independently, challenge weak assumptions, and synthesize a useful response. Add files, research the web, talk in realtime, connect MCP tools, and approve local actions—without a Nexus account or cloud conversation database.

**First comment:** Nexus is an early public beta. We published the source, security model, privacy notice, CI, and checksums before asking anyone to install it. We are looking for honest reports on model collaboration quality, accessibility, and macOS packaging.

## Video storyboard

1. `0–3s` — One prompt enters Council mode.
2. `3–8s` — OpenAI and Anthropic appear as independent proposals.
3. `8–14s` — One disagreement is highlighted.
4. `14–21s` — Nexus produces the final attributed answer.
5. `21–27s` — Drop a PDF and start cited research.
6. `27–33s` — Show the native approval prompt for a tool.
7. `33–38s` — “Free · open source · local-first” and URL.

Never show a real provider key, private file, personal conversation, or fabricated result.
