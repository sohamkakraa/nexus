import type { Metadata } from "next";
import { SiteFooter, SiteHeader, github } from "../site";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Download or build Nexus, verify artifacts, connect provider keys, and understand local data and permission controls.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <header className={styles.hero}>
          <div><p className={styles.eyebrow}>Documentation / desktop beta</p><h1>Start with the code in view.</h1></div>
          <p>Use a verified build when available or install from source, connect your own provider accounts, and keep control of every privileged action.</p>
        </header>
        <div className={styles.content}>
          <article className={styles.article}>
            <section id="getting-started">
              <h2>Getting started</h2>
              <p>Nexus currently has no compatible stable installer in its versioned manifest. Source development supports macOS, Windows, and Linux with Node.js 22 or newer, npm, and at least one OpenAI or Anthropic API key.</p>
              <pre><code>{`git clone ${github}.git
cd nexus
npm install
npm run dev`}</code></pre>
              <div className={styles.note}><strong>Installer status</strong><p>Check the <a href="/download">download page</a>. Unsigned macOS or Windows candidates are retained as workflow artifacts and are not published as stable downloads.</p></div>
            </section>
            <section id="downloads">
              <h2>Verify a download</h2>
              <ol>
                <li>Confirm the download page matched your platform and architecture from the stable release manifest.</li>
                <li>Compare the file&apos;s SHA-256 with <code>SHA256SUMS.txt</code> from the same tagged GitHub release.</li>
                <li>Confirm macOS reports a notarized Developer ID build or Windows reports a valid Authenticode publisher.</li>
              </ol>
            </section>
            <section id="keys">
              <h2>Bring your own keys</h2>
              <p>Open Connections in the desktop app and add an API key for the provider you want to use. Nexus stores provider keys in macOS Keychain, Windows Credential Manager, or a Secret Service-compatible Linux keyring. They are not written to SQLite, preferences, diagnostics, exported data, the website, or child-process environments.</p>
              <p>Requests go directly from the app to the selected provider. Provider pricing, data controls, and retention terms still apply to those requests.</p>
            </section>
            <section id="council">
              <h2>Council mode</h2>
              <ol>
                <li>Two selected models receive the same current request and create independent proposals.</li>
                <li>A reviewer compares concrete agreements, conflicts, omissions, and corrections.</li>
                <li>An editor returns one answer and briefly preserves material disagreement.</li>
              </ol>
              <p>Nexus requests conclusions and evidence. It does not request or display hidden chain-of-thought.</p>
            </section>
            <section id="permissions">
              <h2>Permission boundaries</h2>
              <p>Commands use a small read-only allowlist and execute without a shell. MCP server connections and every MCP tool call require visible approval. Unexpected Chromium permissions, navigation, popups, webviews, device access, and screen capture are denied.</p>
              <p>Microphone access is granted only to the trusted renderer for a voice session you start. Recording and transcription are separately opt-in.</p>
            </section>
            <section id="local-data">
              <h2>Local data controls</h2>
              <p>Connections includes controls to set history retention, inspect or delete optional personalization notes, export conversations and imported files, and delete local history, files, recordings, skills, preferences, and diagnostics.</p>
              <p>Deleting local data does not silently remove credential-store entries. Remove each provider in Connections when you also want its stored key deleted.</p>
            </section>
            <section id="verification">
              <h2>Verify a checkout</h2>
              <pre><code>{`npm run lint
npm run typecheck
npm test
npm run manifest:validate
npm run build
npm run package
npm --prefix website run build
npm run test:website:e2e`}</code></pre>
              <p>Live provider tests are not run by default because they require personal credentials and can incur provider charges.</p>
            </section>
          </article>
          <aside className={styles.aside} aria-label="On this page">
            <span>On this page</span>
            <a href="#getting-started">Getting started</a>
            <a href="#downloads">Verify downloads</a>
            <a href="#keys">Provider keys</a>
            <a href="#council">Council mode</a>
            <a href="#permissions">Permissions</a>
            <a href="#local-data">Local data</a>
            <a href="#verification">Verification</a>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
