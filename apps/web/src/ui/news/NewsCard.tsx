"use client";

import { latestFeed, newsRules } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { useT } from "../../i18n";
import { Card } from "../Card";
import { screenHref } from "../shell/screens";
import styles from "./news.module.css";
import { RoundFeed } from "./RoundFeed";

/** Cartão da Início: as manchetes mais relevantes da última rodada (014 FR-007). */
export function NewsCard({ save }: { save: SaveFile }) {
  const t = useT();
  const feed = latestFeed(save.news);
  const { homeLimit } = newsRules(save.bank, save.league.competitionId);
  return (
    <Card aria-label={t("news.title")} className={styles.card}>
      <h2>
        {feed
          ? feed.round === 0
            ? `${t("news.title")} · ${t("news.summaryRound")}`
            : `${t("news.title")} · ${t("news.round", { round: feed.round })}`
          : t("news.title")}
      </h2>
      <RoundFeed
        save={save}
        headlines={feed?.headlines ?? []}
        round={feed?.round ?? 0}
        limit={homeLimit}
      />
      <Link href={screenHref("/jogo/noticias", save.id)}>{t("news.seeAll")}</Link>
    </Card>
  );
}
