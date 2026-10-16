"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useGame } from "../game/GameProvider";
import { useT } from "../i18n";
import type { SummaryEntry } from "../storage/indexeddb";
import { readPreferences } from "../storage/preferences";
import styles from "./page.module.css";

export default function OpeningPage() {
  const t = useT();
  const { store } = useGame();
  const [last, setLast] = useState<SummaryEntry | undefined>();
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let alive = true;
    store
      .listSummaries()
      .then((summaries) => {
        if (!alive) return;
        const lastId = readPreferences().lastCareerId;
        const candidates = summaries.filter((summary) => summary.status === "ok");
        setLast(candidates.find((summary) => summary.id === lastId) ?? candidates[0]);
      })
      .catch(() => alive && setUnavailable(true));
    return () => {
      alive = false;
    };
  }, [store]);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{t("app.title")}</h1>
      <p className={styles.tagline}>{t("app.tagline")}</p>
      {unavailable ? (
        <p role="alert" className={styles.warning}>
          {t("opening.storageUnavailable")}
        </p>
      ) : null}
      <nav className={styles.menu} aria-label={t("nav.menu")}>
        {last ? (
          <Link className={styles.primary} href={`/jogo/?c=${last.id}`}>
            <span>{t("opening.continue")}</span>
            <small>
              {t("opening.continueDetail", {
                manager: last.managerName,
                club: last.clubName,
                round: last.round,
              })}
            </small>
          </Link>
        ) : null}
        <Link className={last ? styles.secondary : styles.primary} href="/nova-carreira/">
          {t("opening.newCareer")}
        </Link>
        <Link className={styles.secondary} href="/carreiras/">
          {t("opening.savedCareers")}
        </Link>
      </nav>
    </main>
  );
}
