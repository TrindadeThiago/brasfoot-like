"use client";

import type { SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { useT } from "../i18n";
import { screenHref } from "./AppHeader";
import { Button } from "./Button";
import styles from "./LineupNotice.module.css";
import { changeText } from "./lineup-text";

/** Aviso do ajuste automático da escalação (FR-015), até o jogador dispensar. */
export function LineupNotice({ save, onDismiss }: { save: SaveFile; onDismiss: () => void }) {
  const t = useT();
  const title = t("lineupChange.title");
  return (
    <section aria-label={title} className={styles.notice}>
      <h2>{title}</h2>
      <ul>
        {(save.lineupNotice ?? []).map((change, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: trocas em ordem, sem identificador próprio
          <li key={index}>{changeText(change, save)}</li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Link href={screenHref("/jogo/escalacao", save.id)}>{t("lineupChange.view")}</Link>
        <Button onClick={onDismiss}>{t("lineupChange.dismiss")}</Button>
      </div>
    </section>
  );
}
