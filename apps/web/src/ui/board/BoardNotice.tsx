"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Button } from "../Button";
import styles from "./board.module.css";

/** Aviso de demissão ou de contratação na Início, até o jogador dispensar (US3, US4). */
export function BoardNotice({ save, onDismiss }: { save: SaveFile; onDismiss: () => void }) {
  const t = useT();
  const notice = save.board.notice;
  if (!notice) return null;
  const club = save.bank.clubs.find((entry) => entry.id === notice.clubId)?.name ?? notice.clubId;
  return (
    <div
      role="status"
      className={`${styles.notice} ${notice.kind === "fired" ? styles.fired : ""}`}
    >
      <p>{t(`board.notice.${notice.kind}`, { club })}</p>
      <Button onClick={onDismiss}>{t("board.notice.dismiss")}</Button>
    </div>
  );
}
