"use client";

import { betaReleaseNotes, releaseNotes } from "@brasfoot-like/i18n";
import { useEffect, useState } from "react";
import { APP_VERSION } from "../../app-info";
import { isNewVersion } from "../../game/release-view";
import { currentLocale, formatDate, useT } from "../../i18n";
import { readPreferences, writePreferences } from "../../storage/preferences";
import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { EntryShell } from "../../ui/entry/EntryShell";
import styles from "./page.module.css";

/** Notas de versão (016 US5): vêm do build, abrem sem rede. */
export default function ReleaseNotesPage() {
  const t = useT();
  const notes = releaseNotes(currentLocale());
  const betaNotes = betaReleaseNotes(currentLocale());
  // A última versão vista é lida antes de gravar a atual: a marca "Nova" dura a visita inteira (031).
  const [lastSeen, setLastSeen] = useState<{ value: string | undefined } | null>(null);

  // Ver as notas conta como já ter visto as novidades desta versão.
  useEffect(() => {
    setLastSeen({ value: readPreferences().lastSeenVersion });
    return writePreferences({ lastSeenVersion: APP_VERSION });
  }, []);

  return (
    <EntryShell title={t("notes.title")}>
      {notes.map((note, index) => (
        <Card key={note.version} aria-labelledby={`notes-${note.version}`} className={styles.card}>
          <details open={index === 0}>
            <summary className={styles.summary}>
              <h2 id={`notes-${note.version}`} className={styles.heading}>
                {t("notes.version", { version: note.version, date: formatDate(note.date) })}
              </h2>
              {lastSeen && isNewVersion(note.version, lastSeen.value) ? (
                <Badge tone="accent">{t("notes.new")}</Badge>
              ) : null}
            </summary>
            <ul>
              {note.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </details>
        </Card>
      ))}
      <details className={styles.beta}>
        <summary>{t("notes.beta.title")}</summary>
        <p>{t("notes.beta.intro")}</p>
        {betaNotes.map((note) => (
          <Card key={note.version} className={styles.card}>
            <details>
              <summary className={styles.summary}>
                <h3 className={styles.heading}>
                  {t("notes.beta.version", { version: note.version, date: formatDate(note.date) })}
                </h3>
                <Badge>{t("notes.beta.label")}</Badge>
              </summary>
              <ul>
                {note.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </details>
          </Card>
        ))}
      </details>
    </EntryShell>
  );
}
