import type { Metadata } from "next";
import { SiteFooter, SiteHeader, github } from "../site";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "Legal",
  description: "Nexus licensing, third-party services, trademarks, warranties, and responsible-use notices.",
  alternates: { canonical: "/legal" },
};

export default function LegalPage() {
  return (
    <>
      <SiteHeader />
      <main className={styles.main}>
        <header className={styles.hero}>
          <div><p className={styles.eyebrow}>Legal</p><h1>Open source, with clear boundaries.</h1></div>
          <p>Nexus is independent software. Provider names identify compatible services and do not imply sponsorship or endorsement.</p>
        </header>
        <div className={styles.content}>
          <article className={styles.article}>
            <section id="license">
              <h2>Software license</h2>
              <p>Nexus source code is licensed under the <a href={`${github}/blob/main/LICENSE`}>MIT License</a>. The license includes the full warranty and liability disclaimer. Dependency licenses remain their respective owners&apos; terms.</p>
            </section>
            <section id="services">
              <h2>Third-party services</h2>
              <p>OpenAI, Anthropic, Apple, GitHub, Vercel, and MCP server operators provide separate services under their own agreements. You are responsible for your accounts, credentials, provider charges, data settings, and compliance with those agreements.</p>
            </section>
            <section id="use">
              <h2>Responsible use</h2>
              <p>Model output can be incomplete or wrong. Review consequential decisions and every approved tool action. Do not use Nexus to bypass access controls, violate privacy, impersonate people, create unsolicited bulk activity, or automate behavior prohibited by a platform.</p>
            </section>
            <section id="marks">
              <h2>Names and marks</h2>
              <p>OpenAI and Anthropic are names of their respective owners. The MIT license grants rights to the code; it does not grant rights to third-party marks or imply that derivative products are official Nexus releases.</p>
            </section>
          </article>
          <aside className={styles.aside} aria-label="On this page">
            <span>On this page</span>
            <a href="#license">License</a>
            <a href="#services">Services</a>
            <a href="#use">Responsible use</a>
            <a href="#marks">Names & marks</a>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
