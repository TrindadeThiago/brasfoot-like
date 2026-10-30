"use client";

import { usePathname } from "next/navigation";
import { applyUpdate, useUpdateReady } from "../app/register-sw";
import { useT } from "../i18n";
import { Button } from "./Button";
import { Notice } from "./Notice";
import { screenOf } from "./shortcuts";
import styles from "./UpdateNotice.module.css";

/**
 * Aviso de versão nova (016 R3). Nunca aparece na rodada ao vivo: só ao sair dela, para a troca
 * de versão não interromper a partida.
 */
export function UpdateNotice() {
  const t = useT();
  const ready = useUpdateReady();
  const screen = screenOf(usePathname() ?? "/");
  if (!ready || screen === "round") return null;
  return (
    <Notice role="status" title={t("update.available")} className={styles.notice}>
      <p className={styles.detail}>{t("update.detail")}</p>
      <Button variant="primary" onClick={applyUpdate}>
        {t("update.reload")}
      </Button>
    </Notice>
  );
}
