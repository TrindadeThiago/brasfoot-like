import type { Unavailability } from "@brasfoot-like/engine";
import { useT } from "../i18n";
import styles from "./PlayerCondition.module.css";

/** Condição do jogador: disponível, lesionado ou suspenso (com partidas restantes). */
export function Condition({
  entry,
  hideAvailable = false,
}: {
  entry: Unavailability | undefined;
  hideAvailable?: boolean;
}) {
  const t = useT();
  if (!entry) return hideAvailable ? null : <span>{t("squad.available")}</span>;
  return (
    <span className={styles.unavailable}>
      {t(entry.reason === "injury" ? "squad.injured" : "squad.suspended", {
        matches: entry.remaining,
      })}
    </span>
  );
}

/** Texto da condição, para tabelas e ordenação. */
export function conditionText(
  t: (key: string, values?: Record<string, string | number>) => string,
  entry: Unavailability | undefined,
): string {
  if (!entry) return t("squad.available");
  return t(entry.reason === "injury" ? "squad.injured" : "squad.suspended", {
    matches: entry.remaining,
  });
}
