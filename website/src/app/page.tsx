import type { CSSProperties } from "react";
import { DownloadExperience } from "@/components/DownloadExperience";
import styles from "./page.module.css";

const github = "https://github.com/sohamkakraa/nexus";
const releases = `${github}/releases`;

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Nexus",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "macOS, Windows, Linux",
      url: "https://nexus.sohamkakra.com",
      softwareVersion: "0.1.0",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      license: "https://opensource.org/license/mit",
      isAccessibleForFree: true,
      description:
        "A local-first AI Council where OpenAI and Anthropic independently draft, critique, and synthesize responses.",
      author: { "@type": "Person", name: "Soham Kakra", url: "https://sohamkakra.com" },
      sameAs: github,
      releaseNotes: "https://nexus.sohamkakra.com/changelog",
    },
    {
      "@type": "Product",
      name: "Nexus Desktop",
      category: "AI productivity software",
      description:
        "An open-source, local-first desktop workspace for comparing OpenAI and Anthropic responses.",
      brand: { "@type": "Brand", name: "Nexus" },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: "https://nexus.sohamkakra.com/download",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does Nexus store my API keys?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Nexus stores provider API keys in the operating system credential store. The marketing website never receives or handles API keys.",
          },
        },
        {
          "@type": "Question",
          name: "Is Nexus free and open source?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Nexus is MIT licensed. You pay only the AI providers you choose to use.",
          },
        },
        {
          "@type": "Question",
          name: "Does Council mode expose private reasoning?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Nexus exchanges proposals, evidence, and concise critiques rather than requesting hidden chain-of-thought.",
          },
        },
        {
          "@type": "Question",
          name: "Can Nexus control my Mac?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Only through narrow, allowlisted capabilities. Approved commands and system actions require a visible per-action confirmation.",
          },
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <header className={styles.nav}>
        <a className={styles.brand} href="#top" aria-label="Nexus home">
          <NexusMark /><span>Nexus</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how">How it works</a>
          <a href="#security">Security</a>
          <a href="/docs">Docs</a>
          <a href={github} target="_blank" rel="noreferrer">GitHub</a>
        </nav>
        <a className={styles.navDownload} href="/download">Download <span>↓</span></a>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <div className={styles.heroWash} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <div className={styles.signal}><i /> Free · open source · local-first</div>
            <h1>Don&apos;t ask one AI.<span>Convene a council.</span></h1>
            <p>
              Nexus lets OpenAI and Anthropic think independently, challenge weak
              assumptions, and return one considered answer—privately on your desktop.
            </p>
            <div className={styles.heroActions}>
              <DownloadExperience compact />
              <a className={styles.secondary} href={github} target="_blank" rel="noreferrer"><GitHubIcon /> Read the source</a>
            </div>
            <div className={styles.requirements}>
              <span>macOS · Windows · Linux</span><i /><span>Architecture matched locally</span><i /><span>Bring your own keys</span>
            </div>
          </div>
          <CouncilDemo />
        </section>

        <section className={styles.releaseStatus} aria-labelledby="release-title">
          <div>
            <div className={styles.sectionLabel}>Release status</div>
            <h2 id="release-title">Source open. Public installers pending.</h2>
          </div>
          <p>
            Nexus currently has no compatible stable installer in its versioned
            manifest. Release automation is configured for macOS, Windows, and Linux;
            unsigned output remains clearly marked as a prerelease.
          </p>
          <div>
            <a className={styles.primary} href="/download">Open downloads</a>
            <a className={styles.textLink} href={releases}>Inspect releases <span>→</span></a>
          </div>
        </section>

        <section className={styles.trustStrip} aria-label="Core promises">
          <div><strong>02</strong><span>frontier model providers</span></div>
          <div><strong>10</strong><span>files in one turn</span></div>
          <div><strong>00</strong><span>Nexus accounts required</span></div>
          <div><strong>MIT</strong><span>licensed forever</span></div>
        </section>

        <section className={styles.thesis} id="how">
          <div className={styles.sectionLabel}>The Council protocol</div>
          <div className={styles.thesisGrid}>
            <h2>Agreement is useful.<br />Disagreement is evidence.</h2>
            <p>
              Most AI interfaces choose one model and hide its blind spots. Nexus makes
              the comparison visible: each model proposes an answer, reviews concrete
              conflicts, and helps edit the final response.
            </p>
          </div>
          <div className={styles.protocol}>
            <Protocol number="01" title="Independent drafts" copy="Models receive the same brief before seeing each other's proposal." mode="propose" />
            <Protocol number="02" title="Concrete critique" copy="They identify factual conflicts, missing context, and fragile assumptions." mode="challenge" />
            <Protocol number="03" title="One useful answer" copy="Nexus synthesizes the strongest parts and preserves material disagreement." mode="resolve" />
          </div>
        </section>

        <section className={styles.featureStage}>
          <div className={styles.sectionLabel}>One focused workspace</div>
          <div className={styles.featureHeader}>
            <h2>From question to<br />finished work.</h2>
            <p>Chat is only the surface. Nexus connects models to the files, research, voice, and tools needed to complete the task.</p>
          </div>
          <div className={styles.featureGrid}>
            <article className={styles.featureWide}>
              <div className={styles.windowChrome}><i /><i /><i /><span>Research / running</span></div>
              <div className={styles.researchVisual}>
                <div><span>Source map</span><b>18</b><small>credible references</small></div>
                <ol><li><i />Primary sources</li><li><i />Contradictions</li><li><i />Synthesis</li></ol>
              </div>
              <div><span className={styles.tag}>Research</span><h3>Frontier search with receipts.</h3><p>Quick answers or deep reports with source inspection, bounded tool calls, progress, and cancellation.</p></div>
            </article>
            <article><VoiceVisual /><span className={styles.tag}>Realtime</span><h3>Call the agent.</h3><p>Talk naturally, opt into recording, and turn meetings into local transcripts.</p></article>
            <article><div className={styles.filesVisual}><span>brief.pdf</span><span>screen.png</span><span>data.csv</span><span>+7</span></div><span className={styles.tag}>Multimodal</span><h3>Bring the whole brief.</h3><p>Drop images, PDFs, documents, code, data, or audio into one conversation.</p></article>
            <article><div className={styles.toolsVisual}><span>MCP</span><i /><span>CLI</span><i /><span>OS</span></div><span className={styles.tag}>Tools</span><h3>Power with a permission slip.</h3><p>Connect MCP, the command line, and supported system actions with explicit approvals.</p></article>
          </div>
        </section>

        <section className={styles.security} id="security">
          <div className={styles.securityCopy}>
            <div className={styles.sectionLabel}>Security model</div>
            <h2>Your keys unlock<br />your models. Not us.</h2>
            <p>
              Nexus is a desktop client, not an AI proxy. The website never asks for API
              keys. The app stores them in your operating system credential store and sends requests directly to
              the providers you select.
            </p>
            <a href="/security">Read the security architecture <span>→</span></a>
          </div>
          <div className={styles.securityMap} aria-label="Nexus data flow">
            <div className={styles.device}><span>Your device</span><strong>Nexus</strong><small>history · files · permissions</small><div className={styles.keychip}>⌁ OS credential store</div></div>
            <div className={styles.connection}><i /><span>TLS</span><i /></div>
            <div className={styles.providers}><div><span>O</span><b>OpenAI API</b></div><div><span>A</span><b>Anthropic API</b></div></div>
            <p>No Nexus cloud database. No shared API key. No silent telemetry.</p>
          </div>
        </section>

        <section className={styles.openSource}>
          <div className={styles.sourceOrb}><NexusMark /><span>MIT</span></div>
          <div><div className={styles.sectionLabel}>Open by default</div><h2>Trust code you can inspect.</h2><p>Nexus is free to use, fork, audit, and improve. The roadmap, security model, automated tests, and release artifacts live in public.</p></div>
          <div className={styles.sourceActions}><a className={styles.primary} href={github} target="_blank" rel="noreferrer"><GitHubIcon /> Star on GitHub</a><a className={styles.textLink} href={`${github}/issues`} target="_blank" rel="noreferrer">Join the roadmap <span>→</span></a></div>
        </section>

        <section className={styles.faq}>
          <div className={styles.sectionLabel}>Clear answers</div>
          <h2>Before you install.</h2>
          <div className={styles.faqGrid}>
            <details open><summary>Is Nexus actually free?</summary><p>Yes. The app is MIT licensed and has no subscription. OpenAI and Anthropic charge your own API account for usage.</p></details>
            <details><summary>Can Nexus see my API keys?</summary><p>The desktop process reads keys from the operating system credential store to call your selected provider. The website and maintainers never receive them.</p></details>
            <details><summary>Does Council mode expose private reasoning?</summary><p>No. Nexus exchanges proposals, evidence, and concise critiques—not hidden chain-of-thought.</p></details>
            <details><summary>Can it control my system?</summary><p>Read-only command controls are cross-platform. Apple Events are available only on macOS and require a visible approval prompt.</p></details>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div className={styles.finalLines} aria-hidden="true"><i /><i /><i /></div>
          <NexusMark /><div className={styles.sectionLabel}>Ready when the question is difficult</div>
          <h2>Bring a second mind.</h2>
          <p>Download a verified build when available, connect the providers you already use, and convene your first Council.</p>
          <DownloadExperience compact />
          <small>Free and open source · macOS · Windows · Linux</small>
        </section>
      </main>

      <footer className={styles.footer}>
        <a className={styles.brand} href="#top"><NexusMark /><span>Nexus</span></a>
        <p>Independent minds. Considered answers.</p>
        <nav><a href="/privacy">Privacy</a><a href="/security">Security</a><a href="/docs">Docs</a><a href="/changelog">Changelog</a><a href="/community">Community</a><a href={github} target="_blank" rel="noreferrer">GitHub</a></nav>
        <small>© {new Date().getFullYear()} Nexus contributors. MIT licensed.</small>
      </footer>
    </>
  );
}

function Protocol({ number, title, copy, mode }: { number: string; title: string; copy: string; mode: string }) {
  return <article><span>{number} / {mode}</span><div className={`${styles.protocolGlyph} ${styles[mode] ?? ""}`}><i /><i /></div><h3>{title}</h3><p>{copy}</p></article>;
}

function CouncilDemo() {
  return (
    <div className={styles.demo} aria-label="Preview of Nexus Council mode">
      <div className={styles.demoBar}><div><i /><i /><i /></div><span>Nexus / Council</span><b>Private session</b></div>
      <div className={styles.demoBody}>
        <aside><NexusMark /><span className={styles.activeDot}>Today</span><i /><i /><i /><small>⌘ K</small></aside>
        <div className={styles.demoConversation}>
          <div className={styles.demoHeader}><div><small>COUNCIL THREAD</small><strong>Choose the right launch strategy</strong></div><span>•••</span></div>
          <div className={styles.userPrompt}>Challenge my assumptions before recommending a launch plan.</div>
          <div className={styles.councilStatus}><span><i className={styles.openaiDot} /> OpenAI <b>proposed</b></span><span><i className={styles.anthropicDot} /> Anthropic <b>reviewing</b></span></div>
          <div className={styles.answer}><div className={styles.answerMark}><NexusMark /></div><div><small>NEXUS COUNCIL</small><p>Start with the narrowest audience that experiences the problem weekly. The models agree on a public beta, but disagree on timing:</p><ul><li><i />Validate retention before paid acquisition.</li><li><i />Publish the security model before launch.</li></ul></div></div>
          <div className={styles.composer}>Ask a follow-up… <span>↑</span></div>
        </div>
      </div>
      <div className={styles.demoGlow} aria-hidden="true" />
    </div>
  );
}

function VoiceVisual() {
  return <div className={styles.voiceVisual}><span>00:48</span><div>{Array.from({ length: 23 }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}</div><small>Live · not recording</small></div>;
}

function NexusMark() {
  return <span className={styles.nexusMark} aria-hidden="true"><i /><i /></span>;
}

function GitHubIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.3-5.28-1.29-5.28-5.69 0-1.26.45-2.28 1.2-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.75 0c2.19-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.81 1.2 1.83 1.2 3.09 0 4.41-2.72 5.39-5.3 5.68.42.36.79 1.06.79 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" /></svg>;
}
