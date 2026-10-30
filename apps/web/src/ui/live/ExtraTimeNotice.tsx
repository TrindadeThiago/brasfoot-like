"use client";

import { useT } from "../../i18n";
import { Notice } from "../Notice";

/** Aviso de prorrogação na rodada ao vivo (030); continua anunciado como `status`. */
export function ExtraTimeNotice() {
  const t = useT();
  return (
    <Notice role="status" tone="info" title={t("cup.extraTimeTitle")}>
      <p>{t("cup.extraTimeNotice")}</p>
    </Notice>
  );
}
