import Link from "next/link";
import styles from "./content.module.css";

export const github = "https://github.com/sohamkakraa/nexus";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="Nexus home">
        <span className={styles.mark} aria-hidden="true"><i /><i /></span>
        Nexus
      </Link>
      <nav aria-label="Site navigation">
        <Link href="/download">Download</Link>
        <Link href="/docs">Docs</Link>
        <Link href="/security">Security</Link>
        <Link href="/changelog">Changelog</Link>
        <a href={github}>GitHub</a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div>
        <span className={styles.mark} aria-hidden="true"><i /><i /></span>
        <strong>Nexus</strong>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/download">Download</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/legal">Legal</Link>
        <Link href="/community">Community</Link>
        <a href={`${github}/blob/main/LICENSE`}>MIT license</a>
      </nav>
      <small>Open-source software. No account, cloud database, or silent telemetry.</small>
    </footer>
  );
}
