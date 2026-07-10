import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../site";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Release notes and public launch status for Nexus.",
  alternates: { canonical: "/changelog" },
};

export default function ChangelogPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <header className={styles.hero}>
          <div><p className={styles.eyebrow}>Changelog</p><h1>What changed, and what is not ready yet.</h1></div>
          <p>Release notes state the artifact status plainly. Source availability does not imply code signing, notarization, or independent audit.</p>
        </header>
        <div className={styles.timeline}>
          <article>
            <time dateTime="2026-07-10">July 10, 2026</time>
            <div>
              <h2>0.1.0 — public source beta</h2>
              <p>Prepared the Electron app and website for open-source review: sender-validated IPC, permission denial, Keychain-only provider credentials, constrained command and MCP environments, bounded research, local retention/export/delete controls, opt-in personalization and feedback packages, governance documentation, and automated checks.</p>
              <div className={styles.status}><strong>Distribution status</strong><p>Source only. No signed or notarized macOS installer is claimed or published.</p></div>
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
