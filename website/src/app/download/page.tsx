import type { Metadata } from "next";
import Link from "next/link";
import { DownloadExperience } from "@/components/DownloadExperience";
import styles from "./download.module.css";

export const metadata: Metadata = {
  title: "Download",
  description: "Download the matching Nexus desktop build for macOS, Windows, or Linux and verify its checksum and signing status.",
  alternates: { canonical: "/download" },
};

export default function DownloadPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.back} href="/">← Nexus home</Link>
        <div className={styles.heading}>
          <div>
            <p>Desktop downloads</p>
            <h1>Built for your machine.</h1>
          </div>
          <span>
            Nexus uses local browser signals only. If architecture is uncertain,
            you choose before any download starts.
          </span>
        </div>
        <DownloadExperience />
      </div>
    </main>
  );
}
