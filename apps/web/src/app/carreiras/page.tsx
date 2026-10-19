"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useGame } from "../../game/GameProvider";
import { formatDateTime, useT } from "../../i18n";
import type { SummaryEntry } from "../../storage/indexeddb";
import { Button } from "../../ui/Button";
import { Crest } from "../../ui/Crest";
import { Dialog } from "../../ui/Dialog";
import styles from "./page.module.css";

export default function SavesPage() {
  const t = useT();
  const { store, deleteCareer } = useGame();
  const [summaries, setSummaries] = useState<SummaryEntry[] | undefined>();
  const [unavailable, setUnavailable] = useState(false);
  const [pending, setPending] = useState<SummaryEntry | undefined>();

  const refresh = useCallback(() => {
    store
      .listSummaries()
      .then(setSummaries)
      .catch(() => setUnavailable(true));
  }, [store]);

  useEffect(refresh, [refresh]);

  async function confirmDelete() {
    if (!pending) return;
    await deleteCareer(pending.id);
    setPending(undefined);
    refresh();
  }

  return (
    <main className={styles.page}>
      <Link href="/">{t("common.back")}</Link>
      <h1>{t("saves.title")}</h1>
      {unavailable ? <p role="alert">{t("opening.storageUnavailable")}</p> : null}
      {summaries && summaries.length === 0 ? <p>{t("saves.empty")}</p> : null}
      <ul className={styles.list}>
        {(summaries ?? []).map((summary) => (
          <li key={summary.id} className={styles.item}>
            <Crest crest={summary.clubCrest} label={summary.clubName || summary.id} size={44} />
            <div className={styles.info}>
              {summary.status === "corrupt" ? (
                <strong>{t("saves.corrupt")}</strong>
              ) : (
                <>
                  <strong>
                    {summary.managerName} · {summary.clubName}
                  </strong>
                  <span>
                    {summary.seasonOver
                      ? t("saves.seasonOver", {
                          year: summary.seasonYear,
                          division: summary.divisionName,
                        })
                      : t("saves.progress", {
                          year: summary.seasonYear,
                          round: summary.round,
                          division: summary.divisionName,
                        })}
                  </span>
                  <small>{t("saves.savedAt", { date: formatDateTime(summary.savedAt) })}</small>
                  {summary.status === "future_version" ? <em>{t("saves.future")}</em> : null}
                </>
              )}
            </div>
            <div className={styles.actions}>
              {summary.status === "ok" ? (
                <Link className={styles.continue} href={`/jogo/?c=${summary.id}`}>
                  {t("saves.continue")}
                </Link>
              ) : null}
              <Button variant="danger" onClick={() => setPending(summary)}>
                {t("saves.delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Dialog
        open={pending !== undefined}
        title={t("saves.confirmDeleteTitle")}
        onClose={() => setPending(undefined)}
        actions={
          <>
            <Button onClick={() => setPending(undefined)}>{t("common.cancel")}</Button>
            <Button variant="danger" onClick={() => void confirmDelete()}>
              {t("saves.delete")}
            </Button>
          </>
        }
      >
        {pending
          ? t("saves.confirmDeleteBody", { manager: pending.managerName, club: pending.clubName })
          : null}
      </Dialog>
    </main>
  );
}
