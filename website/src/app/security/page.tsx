import type { Metadata } from "next";
import { SiteFooter, SiteHeader, github } from "../site";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "Security",
  description: "The Nexus desktop trust model, Keychain boundary, IPC validation, permissions, MCP isolation, and vulnerability reporting.",
  alternates: { canonical: "/security" },
};

export default function SecurityPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <header className={styles.hero}>
          <div><p className={styles.eyebrow}>Security model</p><h1>Local-first is a boundary, not a slogan.</h1></div>
          <p>Nexus narrows privileged desktop capabilities, asks before consequential actions, and keeps provider credentials in macOS Keychain.</p>
        </header>
        <div className={styles.content}>
          <article className={styles.article}>
            <section id="status">
              <h2>Current assurance</h2>
              <div className={styles.note}><strong>Source beta; not independently audited</strong><p>The controls below are implemented and tested in the repository. They are not a claim of formal verification, third-party penetration testing, or Apple notarization.</p></div>
            </section>
            <section id="keys">
              <h2>Credential boundary</h2>
              <p>OpenAI and Anthropic keys are stored and retrieved with macOS Keychain through the app&apos;s main process. They are excluded from renderer snapshots, diagnostics, data exports, local MCP environments, and approved command environments.</p>
              <p>The website is static and has no key-entry form, authentication, analytics SDK, or server API for prompts.</p>
            </section>
            <section id="electron">
              <h2>Electron boundary</h2>
              <ul>
                <li>Context isolation, Chromium sandboxing, web security, and no Node.js integration in the renderer.</li>
                <li>Every IPC handler validates the sender, top-level frame, and exact packaged file or loopback development origin.</li>
                <li>Production ignores the development renderer URL environment variable.</li>
                <li>Navigation, popups, webviews, unexpected permissions, hardware devices, and screen capture are denied.</li>
                <li>A restrictive Content Security Policy blocks remote scripts, frames, objects, and forms.</li>
              </ul>
            </section>
            <section id="tools">
              <h2>Commands and MCP</h2>
              <p>The command broker accepts only read-only <code>pwd</code>, <code>ls</code>, <code>rg</code>, and selected Git inspection commands. It rejects shell syntax, absolute and parent paths, dangerous flags, and executable hooks. Commands require per-run approval, use timeouts and output limits, and receive a minimal environment.</p>
              <p>MCP definitions are schema-validated. Local servers receive a minimal environment without provider keys. Connecting a server and calling each tool require separate approvals with redacted argument previews.</p>
            </section>
            <section id="data">
              <h2>Data lifecycle</h2>
              <p>Conversations and metadata use a local SQLite database. Imported files, recordings, skills, preferences, and bounded diagnostics live under the app&apos;s local data directory with restrictive permissions. The app exposes retention, export, and deletion controls.</p>
              <p>Requests and selected file content are sent to the AI providers or MCP servers you explicitly choose. Review their policies before use.</p>
            </section>
            <section id="report">
              <h2>Report a vulnerability</h2>
              <p>Follow <a href={`${github}/blob/main/SECURITY.md`}>SECURITY.md</a>. Do not post exploitable details in a public issue. Include affected versions, reproduction steps, impact, and a safe way to contact you.</p>
            </section>
          </article>
          <aside className={styles.aside} aria-label="On this page">
            <span>On this page</span>
            <a href="#status">Assurance status</a>
            <a href="#keys">Credentials</a>
            <a href="#electron">Electron</a>
            <a href="#tools">Tools & MCP</a>
            <a href="#data">Data lifecycle</a>
            <a href="#report">Report</a>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
