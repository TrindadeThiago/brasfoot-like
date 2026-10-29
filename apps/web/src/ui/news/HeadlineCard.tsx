"use client";

import type { Headline } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useId } from "react";
import { headlineCompetition } from "../../game/news-view";
import { useT } from "../../i18n";
import { Badge } from "../Badge";
import { headlineVars } from "./headline-vars";
import styles from "./news.module.css";

/**
 * Cartão de uma manchete (029): competição e rodada, o título (a frase da manchete) e o texto (os
 * fatos complementares que o jogo já guarda). O destaque do clube do jogador vem em texto.
 */
export function HeadlineCard({
  save,
  headline,
  round,
}: {
  save: SaveFile;
  headline: Headline;
  /** Rodada do feed; 0 = resumo da temporada anterior. */
  round: number;
}) {
  const t = useT();
  const titleId = useId();
  const vars = headlineVars(save, headline.vars);
  const competitionId = headlineCompetition(save, headline);
  const competition =
    competitionId === undefined
      ? t("news.group.general")
      : (save.bank.competitions.find((entry) => entry.id === competitionId)?.name ?? competitionId);
  return (
    <article
      aria-labelledby={titleId}
      className={headline.mine ? `${styles.item} ${styles.mine}` : styles.item}
    >
      <p className={styles.meta}>
        <span>{competition}</span>
        <span aria-hidden="true"> · </span>
        <span>{round === 0 ? t("news.summaryRound") : t("news.round", { round })}</span>
        {headline.mine ? <Badge tone="accent">{t("news.card.mine")}</Badge> : null}
      </p>
      {/* Parágrafo, e não título: nas listas longas e na Início ele competiria com o nome do clube. */}
      <p id={titleId} className={styles.text}>
        {t(`news.${headline.type}.${headline.variant}`, vars)}
      </p>
      {headline.extras?.map((extra) => (
        <p key={extra.type} className={styles.extra}>
          {t(`news.extra.${extra.type}`, headlineVars(save, extra.vars))}
        </p>
      ))}
    </article>
  );
}
