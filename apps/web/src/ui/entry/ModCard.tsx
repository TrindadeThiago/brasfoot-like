"use client";

import { useId } from "react";
import { useT } from "../../i18n";
import type { StoredMod } from "../../storage/mods";
import { Button } from "../Button";
import styles from "./ModCard.module.css";

/** Um mod carregado (031 R10): nome, resumo, países, divisões, imagens e Remover. */
export function ModCard({ mod, onRemove }: { mod: StoredMod; onRemove: () => void }) {
  const t = useT();
  const infoId = useId();
  return (
    <li className={styles.card}>
      <div id={infoId} className={styles.info}>
        <strong>{mod.summary.name}</strong>
        <p className={styles.muted}>
          {t("mods.summary", {
            author: mod.summary.author,
            version: mod.summary.version,
            clubs: mod.summary.clubs,
            players: mod.summary.players,
          })}
        </p>
        {mod.summary.countries.length > 1 ? (
          <p className={styles.muted}>
            {t("mods.countries", {
              count: mod.summary.countries.length,
              countries: mod.summary.countries.join(", "),
            })}
          </p>
        ) : null}
        <p className={styles.muted}>
          {t("mods.divisions", {
            divisions: mod.summary.divisions.map((division) => division.name).join(", "),
          })}{" "}
          · {t("mods.images", { count: mod.summary.images })}
        </p>
      </div>
      <Button variant="danger" onClick={onRemove} aria-describedby={infoId}>
        {t("mods.remove")}
      </Button>
    </li>
  );
}
