"use client";

import type { ValidationIssue } from "@brasfoot-like/engine";
import { issueText, useT } from "../../i18n";
import styles from "./mods.module.css";

/** Relatório de validação de um pacote ou de CSV: erros e avisos agrupados por seção (015). */
export function ValidationReport({
  errors,
  warnings,
}: {
  errors: readonly ValidationIssue[];
  warnings: readonly ValidationIssue[];
}) {
  const t = useT();
  const sections = [...new Set([...errors, ...warnings].map((issue) => issue.section))];
  return (
    <section aria-label={t("mods.report")} className={styles.card}>
      <h2>{t("mods.report")}</h2>
      <p>
        {t("mods.errors", { count: errors.length })} ·{" "}
        {t("mods.warnings", { count: warnings.length })}
      </p>
      {sections.map((section) => (
        <div key={section}>
          <h3>{section}</h3>
          <ul className={styles.issues}>
            {[...errors, ...warnings]
              .filter((issue) => issue.section === section)
              .map((issue) => (
                <li
                  key={`${issue.code}-${issue.path.join(".")}-${issue.entityId ?? ""}`}
                  className={issue.severity === "error" ? styles.error : styles.warning}
                >
                  {issueText(issue)}
                  {typeof issue.params.csvLine === "number" ? (
                    <span className={styles.muted}>
                      {" "}
                      (
                      {t("mods.csvLine", {
                        file: String(issue.params.csvFile),
                        line: issue.params.csvLine,
                      })}
                      )
                    </span>
                  ) : issue.path.length > 0 ? (
                    <span className={styles.muted}> ({issue.path.join(" › ")})</span>
                  ) : null}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
