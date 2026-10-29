"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Button } from "../Button";
import { Notice } from "../Notice";
import styles from "./board.module.css";

/**
 * Aviso de demissão ou de contratação na Início, até o jogador dispensar (US3, US4): usa o aviso da
 * nova interface (029), com a gravidade no título e o mesmo texto e a mesma ação de antes.
 */
export function BoardNotice({ save, onDismiss }: { save: SaveFile; onDismiss: () => void }) {
  const t = useT();
  const notice = save.board.notice;
  if (!notice) return null;
  const club = save.bank.clubs.find((entry) => entry.id === notice.clubId)?.name ?? notice.clubId;
  return (
    <Notice
      role="status"
      tone={notice.kind === "fired" ? "danger" : "info"}
      title={t(`board.notice.${notice.kind}Title`)}
    >
      <div className={styles.noticeBody}>
        <p>{t(`board.notice.${notice.kind}`, { club })}</p>
        <Button onClick={onDismiss}>{t("board.notice.dismiss")}</Button>
      </div>
    </Notice>
  );
}
