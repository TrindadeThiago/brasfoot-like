"use client";

import type { LineupIssue } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../i18n";
import styles from "./LineupIssues.module.css";
import { issueText } from "./lineup-text";

/** Problemas da escalação por gravidade; some quando tudo está certo. */
export function LineupIssues({ issues, save }: { issues: readonly LineupIssue[]; save: SaveFile }) {
  const t = useT();
  return (
    <section aria-label={t("lineup.issues")} className={styles.issues}>
      {issues.length === 0 ? (
        <p className={styles.ok}>{t("lineup.noIssues")}</p>
      ) : (
        <ul>
          {issues.map((issue, index) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: a lista é recalculada a cada mudança
              key={index}
              className={styles[issue.severity]}
            >
              {issueText(issue, save)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
