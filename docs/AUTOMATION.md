# Safe automation

## Local self-improvement

Personalization is disabled by default. When enabled, the user can inspect, edit, export, and delete local notes. Notes are included only in requests the user initiates to selected providers. They are not global training data.

Feedback is also disabled by default. Nexus creates a redacted local JSON package for review and export; it does not upload the package. Prompts, model responses, conversation text, file names, file contents, recordings, and API keys are excluded by default.

## Proposal-agent contract

The scheduled improvement workflow creates or updates one bounded public brief from repository metadata. A separately configured proposal agent may consume that brief only under these rules:

1. one issue, one `proposal/<issue>-<slug>` branch, and one draft pull request per run;
2. no access to local app data, user prompts, provider keys, signing credentials, or production credentials;
3. no direct writes to `main`, merges, tags, releases, deployments, paid APIs, or branch-protection settings;
4. at most one run per week, one proposal per run, 30 minutes wall time, and a configured provider cost ceiling;
5. run `npm run check`, relevant Electron E2E, and website checks before opening the draft PR;
6. include evidence, test results, privacy/security impact, rollback instructions, and an explicit AI-assistance disclosure;
7. stop without creating work when public evidence does not justify a change.

Repository security gates remain authoritative. The current repository contains the deterministic brief and review gates but no hosted proposal-agent credential; configuring that external credential is a maintainer action.

## Marketing automation

Marketing automation is dry-run only until an account owner configures a platform integration and approves both credentials and content. It must obey platform terms and rate limits, use official APIs, and maintain a zero paid-spend default.

Prohibited behavior includes account creation under an invented identity, agreeing to platform terms for a person, scraping audiences, unsolicited bulk messages, cold-DM automation, purchased engagement, fake testimonials, fabricated benchmarks, or automatic replies presented as a human.

Campaign assets and a review calendar may be generated automatically. Publishing requires an explicit per-campaign approval and must remain revocable.
