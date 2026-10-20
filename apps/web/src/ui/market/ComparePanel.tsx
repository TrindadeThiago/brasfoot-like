"use client";

import type { MarketRow } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { formatMoney, label, useT } from "../../i18n";
import { Button } from "../Button";
import styles from "./market.module.css";

/** Comparação lado a lado de 2 a 4 jogadores (US1), só com atributos visíveis. */
export function ComparePanel({
  save,
  rows,
  onClose,
}: {
  save: SaveFile;
  rows: readonly MarketRow[];
  onClose: () => void;
}) {
  const t = useT();
  const clubName = (row: MarketRow) =>
    row.free
      ? t("market.free")
      : (save.bank.clubs.find((club) => club.id === row.clubId)?.shortName ?? "");
  const lines: [string, (row: MarketRow) => string][] = [
    [t("col.playerPosition"), (row) => label(`position.${row.position}`)],
    [t("col.strength"), (row) => String(row.strength)],
    [t("col.age"), (row) => String(row.age)],
    [
      t("col.traits"),
      (row) =>
        row.traits.length > 0
          ? row.traits.map((trait) => label(`trait.${trait}`)).join(", ")
          : t("player.noTraits"),
    ],
    [t("market.col.club"), clubName],
    [t("market.col.value"), (row) => (row.free ? "—" : formatMoney(row.value))],
    [t("market.col.wage"), (row) => formatMoney(row.wage)],
    [t("market.col.until"), (row) => String(row.untilYear ?? "—")],
  ];
  return (
    <section className={styles.card} aria-label={t("market.compare.title")}>
      <h2>{t("market.compare.title")}</h2>
      <table className={styles.compare} aria-label={t("market.compare.title")}>
        <thead>
          <tr>
            <th scope="col">{t("col.player")}</th>
            {rows.map((row) => (
              <th key={row.playerId} scope="col">
                {row.displayName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map(([name, value]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              {rows.map((row) => (
                <td key={row.playerId}>{value(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.actions}>
        <Button onClick={onClose}>{t("common.close")}</Button>
      </div>
    </section>
  );
}
