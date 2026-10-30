"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_VERSION, appName } from "../app-info";
import { useGame } from "../game/GameProvider";
import { savesView } from "../game/saves-view";
import { useT } from "../i18n";
import type { SummaryEntry } from "../storage/indexeddb";
import { readPreferences, writePreferences } from "../storage/preferences";
import { ActionCard } from "../ui/entry/ActionCard";
import { useOpenShortcutsHelp } from "../ui/GlobalShortcuts";
import { Notice } from "../ui/Notice";
import { TipHost } from "../ui/tips/TipHost";
import styles from "./page.module.css";

export default function OpeningPage() {
  const t = useT();
  const { store } = useGame();
  const openHelp = useOpenShortcutsHelp();
  const [last, setLast] = useState<SummaryEntry | undefined>();
  const [unavailable, setUnavailable] = useState(false);
  // Quantidade de carreiras listadas (031); indefinida até a lista chegar ou se o armazenamento falhar.
  const [count, setCount] = useState<number | undefined>();
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
        setCount(savesView(summaries).count);
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
      <header className={styles.hero}>
        <h1 className={styles.title}>{t("app.name")}</h1>
        <p className={styles.tagline}>{t("app.tagline")}</p>
        <p className={styles.pitch}>{t("opening.pitch")}</p>
      </header>
      {whatsNew ? (
        <Notice
          role="status"
          title={t("notes.whatsNew", { version: APP_VERSION })}
          className={styles.notice}
        >
          <div className={styles.noticeActions}>
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
        </Notice>
      ) : null}
      {unavailable ? (
        <Notice
          role="alert"
          tone="warning"
          title={t("opening.storageUnavailable.title")}
          className={styles.notice}
        >
          <p className={styles.noticeText}>{t("opening.storageUnavailable")}</p>
        </Notice>
      ) : null}
      <nav className={styles.menu} aria-label={t("nav.menu")}>
        {last ? (
          <Link className={styles.continue} href={`/jogo/?c=${last.id}`}>
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
        <ActionCard
          href="/nova-carreira/"
          label={t("opening.newCareer")}
          detail={t("opening.newCareerDetail")}
          primary={!last}
          tipAnchor="new-career"
        />
        <ActionCard
          href="/carreiras/"
          label={t("opening.savedCareers")}
          detail={t("opening.savedCareersDetail")}
          badge={count === undefined ? undefined : t("saves.count", { count })}
        />
        <ActionCard href="/mods/" label={t("nav.mods")} detail={t("opening.modsDetail")} />
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
