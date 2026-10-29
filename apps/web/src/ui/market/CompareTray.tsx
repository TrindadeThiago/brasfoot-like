"use client";

import type { MarketRow } from "@brasfoot-like/engine";
import { useT } from "../../i18n";
import { Button } from "../Button";
import styles from "./market.module.css";

export const COMPARE_LIMIT = 4;

/**
 * Bandeja da comparação (028), acima da tabela: quem está na comparação, com Remover, o botão
 * Comparar (de 2 a 4) e o aviso do limite. Some quando não há ninguém.
 */
export function CompareTray({
  rows,
  onRemove,
  onCompare,
}: {
  rows: readonly MarketRow[];
  onRemove: (playerId: string) => void;
  onCompare: () => void;
}) {
  const t = useT();
  if (rows.length === 0) return null;
  return (
    <section aria-label={t("market.tray.label")} className={styles.tray}>
      <strong>{t("market.tray.label")}</strong>
      <ul className={styles.trayChips}>
        {rows.map((row) => (
          <li key={row.playerId} className={styles.chip}>
            {row.displayName}
            <Button
              variant="text"
              aria-label={t("market.tray.remove", { name: row.displayName })}
              onClick={() => onRemove(row.playerId)}
            >
              ×
            </Button>
          </li>
        ))}
      </ul>
      <Button disabled={rows.length < 2} onClick={onCompare}>
        {t("market.compare.open", { count: rows.length })}
      </Button>
      {rows.length < 2 ? <span className={styles.muted}>{t("market.compare.hint")}</span> : null}
      {rows.length >= COMPARE_LIMIT ? (
        <span role="status">{t("market.tray.limit", { max: COMPARE_LIMIT })}</span>
      ) : null}
    </section>
  );
}
