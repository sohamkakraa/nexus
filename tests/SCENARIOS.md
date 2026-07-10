# Renderer workflow scenarios

All scenarios use `tests/fixtures/mockNexus.ts`. They do not read real keys, call providers, or spend API credits.

- **Novice BYOK user:** understands the two-model Council, opens Connections, and verifies local-history language before entering a key.
- **Researcher:** chooses Research brief, confirms lead/challenger context, and edits the workflow before any research action.
- **Developer / power user:** selects compact density and context emphasis, opens commands by keyboard, and prepares a terminal task without executing it.
- **Privacy-focused user:** inspects “Why this changed,” resets local preferences, and runs individual local diagnostics.
- **Accessibility / keyboard user:** traverses navigation, main, and complementary landmarks; uses Command and New shortcuts; and selects reduced motion.
- **Failing-provider / offline user:** sees local capabilities remain available, receives a specific provider error, and keeps an editable brief for retry.

`tests/e2e/renderer.spec.ts` executes these paths in an isolated Electron renderer harness. Every scenario records mock API calls and asserts that no request leaves the local Vite fixture origin.
