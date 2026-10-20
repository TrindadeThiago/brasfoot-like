"use client";

import type { SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { useT } from "../../i18n";
import { screenHref } from "../AppHeader";
import styles from "./board.module.css";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { GoalsList } from "./GoalsList";

/** Cartão da Início: confiança, metas e reputação do técnico empregado (US1, US2, US5). */
export function BoardCard({ save }: { save: SaveFile }) {
  const t = useT();
  const { manager } = save.board;
  const club = manager.clubId ? save.board.clubs[manager.clubId] : undefined;
  if (!club) return null;
  return (
    <section aria-label={t("board.title")} className={styles.card}>
      <h2>{t("board.title")}</h2>
      <p>{t("board.reputation", { value: manager.reputation })}</p>
      <ConfidenceMeter value={club.confidence} recent={club.recent} />
      <h3>{t("board.goals")}</h3>
      <GoalsList save={save} />
      {manager.noFiring ? <p className={styles.muted}>{t("board.noFiring")}</p> : null}
      <Link href={screenHref("/jogo/carreira", save.id)}>{t("nav.career")}</Link>
    </section>
  );
}
