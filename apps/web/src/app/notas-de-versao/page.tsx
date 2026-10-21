"use client";

import { releaseNotes } from "@brasfoot-like/i18n";
import Link from "next/link";
import { useEffect } from "react";
import { APP_VERSION } from "../../app-info";
import { currentLocale, formatDate, useT } from "../../i18n";
import { writePreferences } from "../../storage/preferences";
import styles from "./page.module.css";

/** Notas de versão (016 US5): vêm do build, abrem sem rede. */
export default function ReleaseNotesPage() {
  const t = useT();
  const notes = releaseNotes(currentLocale());

  // Ver as notas conta como já ter visto as novidades desta versão.
  useEffect(() => writePreferences({ lastSeenVersion: APP_VERSION }), []);

  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <Link href="/">{t("common.back")}</Link>
      </div>
      <h1>{t("notes.title")}</h1>
      {notes.map((note) => (
        <section
          key={note.version}
          aria-labelledby={`notes-${note.version}`}
          className={styles.card}
        >
          <h2 id={`notes-${note.version}`}>
            {t("notes.version", { version: note.version, date: formatDate(note.date) })}
          </h2>
          <ul>
            {note.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
