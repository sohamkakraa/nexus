import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../site";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Nexus handles provider keys, local app data, AI requests, optional feedback, and website access.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <header className={styles.hero}>
          <div><p className={styles.eyebrow}>Privacy / effective July 10, 2026</p><h1>Your work does not need a Nexus account.</h1></div>
          <p>The desktop app stores its working data locally and sends content only to providers and tools you choose. This page explains the boundaries.</p>
        </header>
        <div className={styles.content}>
          <article className={styles.article}>
            <section id="desktop">
              <h2>Desktop data</h2>
              <p>Conversations, message search data, imported files, recordings, transcripts, generated skills, preferences, permission decisions, and diagnostics are stored on your device. Nexus does not operate a cloud database for this information.</p>
              <p>Use the in-app controls to choose retention, export local data and imported files, or delete local data. Optional personalization is off by default; when enabled, its inspectable notes are included in requests to the providers you choose.</p>
            </section>
            <section id="keys">
              <h2>Provider credentials</h2>
              <p>OpenAI and Anthropic API keys are stored through the operating system credential store. They are used by the desktop main process to make requests and are excluded from local data exports and diagnostics. Removing a provider in Connections deletes that credential-store entry.</p>
            </section>
            <section id="providers">
              <h2>External providers and tools</h2>
              <p>When you send a request, Nexus sends the request and selected context to the OpenAI or Anthropic account you configured. When you approve an MCP call, that connector receives the displayed arguments. Those services act under their own terms, privacy policies, and account settings.</p>
              <p>Research, image, transcription, realtime, and model usage may incur charges from your provider. Nexus does not add a subscription or receive a share of provider charges.</p>
            </section>
            <section id="feedback">
              <h2>Feedback</h2>
              <p>Feedback packages are opt-in and created as local JSON files for review. Nexus does not upload them automatically. Conversation text, prompts, model responses, file names, file contents, and API keys are excluded by default. A redacted diagnostic excerpt is included only when you select it.</p>
            </section>
            <section id="website">
              <h2>Website</h2>
              <p>This marketing and documentation site does not set analytics cookies, collect API keys, or expose a prompt API. Download matching reads browser platform and architecture hints locally; Nexus does not post them to analytics or a detection endpoint. Vercel hosts the site and may process ordinary request data such as IP address, user agent, requested URL, and timestamps to deliver and secure the service under Vercel&apos;s policies.</p>
            </section>
            <section id="contact">
              <h2>Questions and changes</h2>
              <p>Privacy questions can be opened as a public documentation issue when they contain no sensitive data. Security-sensitive reports should follow SECURITY.md. Material policy changes will be recorded in the repository and dated on this page.</p>
            </section>
          </article>
          <aside className={styles.aside} aria-label="On this page">
            <span>On this page</span>
            <a href="#desktop">Desktop data</a>
            <a href="#keys">Credentials</a>
            <a href="#providers">Providers</a>
            <a href="#feedback">Feedback</a>
            <a href="#website">Website</a>
            <a href="#contact">Contact</a>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
