"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_VERSION, appName } from "../app-info";
import { useGame } from "../game/GameProvider";
import { useT } from "../i18n";
import type { SummaryEntry } from "../storage/indexeddb";
import { readPreferences, writePreferences } from "../storage/preferences";
import { useOpenShortcutsHelp } from "../ui/GlobalShortcuts";
import { TipHost } from "../ui/tips/TipHost";
import styles from "./page.module.css";

export default function OpeningPage() {
  const t = useT();
  const { store } = useGame();
  const openHelp = useOpenShortcutsHelp();
  const [last, setLast] = useState<SummaryEntry | undefined>();
  const [unavailable, setUnavailable] = useState(false);
  // Primeiro acesso (016): nenhuma carreira salva e nenhuma dica registrada.
  const [firstRun, setFirstRun] = useState(false);
  // Aviso de novidades (016 R8): versão vista diferente da atual, ou ausente com carreira salva.
  const [whatsNew, setWhatsNew] = useState(false);

  useEffect(() => {
    let alive = true;
    store
      .listSummaries()
      .then((summaries) => {
        if (!alive) return;
        const lastId = readPreferences().lastCareerId;
        const candidates = summaries.filter((summary) => summary.status === "ok");
        setLast(candidates.find((summary) => summary.id === lastId) ?? candidates[0]);
        setFirstRun(summaries.length === 0 && readPreferences().tips === undefined);
        const seen = readPreferences().lastSeenVersion;
        if (seen === undefined && summaries.length === 0) {
          writePreferences({ lastSeenVersion: APP_VERSION });
        } else {
          setWhatsNew(seen !== APP_VERSION);
        }
      })
      .catch(() => alive && setUnavailable(true));
    return () => {
      alive = false;
    };
  }, [store]);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{t("app.name")}</h1>
      <p className={styles.tagline}>{t("app.tagline")}</p>
      {whatsNew ? (
        <div role="status" aria-labelledby="whats-new" className={styles.notice}>
          <p id="whats-new">{t("notes.whatsNew", { version: APP_VERSION })}</p>
          <Link
            href="/notas-de-versao/"
            onClick={() => writePreferences({ lastSeenVersion: APP_VERSION })}
          >
            {t("notes.whatsNewLink")}
          </Link>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => {
              writePreferences({ lastSeenVersion: APP_VERSION });
              setWhatsNew(false);
            }}
          >
            {t("common.close")}
          </button>
        </div>
      ) : null}
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
        <Link
          className={last ? styles.secondary : styles.primary}
          href="/nova-carreira/"
          data-tip-anchor="new-career"
        >
          {t("opening.newCareer")}
        </Link>
        <Link className={styles.secondary} href="/carreiras/">
          {t("opening.savedCareers")}
        </Link>
        <Link className={styles.secondary} href="/mods/">
          {t("nav.mods")}
        </Link>
      </nav>
      <footer className={styles.footer}>
        <Link href="/configuracoes/">{t("nav.settings")}</Link>
        <Link href="/sobre/">{t("nav.about")}</Link>
        <button type="button" className={styles.linkButton} onClick={openHelp}>
          {t("nav.help")}
        </button>
        <Link href="/notas-de-versao/">
          {t("app.version", { name: appName(), version: APP_VERSION })}
        </Link>
      </footer>
      <TipHost screen="opening" firstRun={firstRun} />
    </main>
  );
}
