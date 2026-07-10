import type { Metadata } from "next";
import { SiteFooter, SiteHeader, github } from "../site";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "Community",
  description: "How to contribute, request support, propose changes, and participate in the Nexus open-source project.",
  alternates: { canonical: "/community" },
};

export default function CommunityPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <header className={styles.hero}>
          <div><p className={styles.eyebrow}>Community</p><h1>Improve the work without weakening the boundary.</h1></div>
          <p>Contributions are welcome when they are reviewable, tested, respectful, and preserve user control over data, spend, and privileged actions.</p>
        </header>
        <div className={styles.content}>
          <article className={styles.article}>
            <section id="participate">
              <h2>Ways to participate</h2>
              <div className={styles.grid}>
                <div className={styles.card}><h3>Report a bug</h3><p>Search existing issues, remove sensitive content, and provide the smallest reliable reproduction.</p><p><a href={`${github}/issues/new/choose`}>Open an issue</a></p></div>
                <div className={styles.card}><h3>Propose a change</h3><p>Explain the user problem, alternatives, privacy impact, and how the result can be verified.</p><p><a href={`${github}/blob/main/CONTRIBUTING.md`}>Contribution guide</a></p></div>
                <div className={styles.card}><h3>Review security</h3><p>Read the threat model and report exploitable details privately according to the security policy.</p><p><a href={`${github}/blob/main/SECURITY.md`}>Security policy</a></p></div>
                <div className={styles.card}><h3>Request help</h3><p>Use the support guide for build problems, account-provider questions, and expected project scope.</p><p><a href={`${github}/blob/main/SUPPORT.md`}>Support guide</a></p></div>
              </div>
            </section>
            <section id="automation">
              <h2>Automation rules</h2>
              <p>Proposal agents may open auditable branches and pull requests, but they may not merge, release, disable checks, expose secrets, or create paid activity automatically. Marketing scaffolding must respect platform terms, configured credentials, rate limits, review gates, and a zero paid-spend default.</p>
            </section>
            <section id="conduct">
              <h2>Conduct</h2>
              <p>Participation is governed by the project Code of Conduct. Focus criticism on the work, protect private information, and make room for contributors with different experience levels.</p>
            </section>
          </article>
          <aside className={styles.aside} aria-label="On this page">
            <span>On this page</span>
            <a href="#participate">Participate</a>
            <a href="#automation">Automation</a>
            <a href="#conduct">Conduct</a>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
