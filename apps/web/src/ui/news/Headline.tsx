"use client";

import type { Headline as HeadlineData, HeadlineVars } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { formatMoney, useT } from "../../i18n";
import styles from "./news.module.css";

/** Variáveis que guardam ids de clube e viram nomes na apresentação. */
const CLUB_VARS = [
  "club",
  "opponent",
  "winner",
  "loser",
  "scorerClub",
  "owner",
  "newClub",
  "newOpponent",
  "prevClub",
  "prevOpponent",
];

/** Variáveis prontas para o template: nomes de clube, divisão, técnico e valores formatados. */
export function headlineVars(save: SaveFile, vars: HeadlineVars): HeadlineVars {
  const names = new Map(save.bank.clubs.map((club) => [club.id, club.name]));
  const resolved: HeadlineVars = { ...vars, manager: save.managerName };
  for (const key of CLUB_VARS) {
    const value = vars[key];
    if (typeof value === "string") resolved[key] = names.get(value) ?? value;
  }
  if (typeof vars.level === "number") resolved.division = divisionNameOf(save, vars.level);
  if (typeof vars.fee === "number") resolved.feeText = formatMoney(vars.fee);
  resolved.hasScorer = typeof vars.player === "string" ? "yes" : "no";
  return resolved;
}

/** Uma manchete: texto da variação, fatos complementares e destaque do clube do jogador. */
export function Headline({ save, headline }: { save: SaveFile; headline: HeadlineData }) {
  const t = useT();
  const vars = headlineVars(save, headline.vars);
  return (
    <li className={headline.mine ? styles.mine : undefined}>
      <p className={styles.text}>{t(`news.${headline.type}.${headline.variant}`, vars)}</p>
      {headline.extras?.map((extra) => (
        <p key={extra.type} className={styles.extra}>
          {t(`news.extra.${extra.type}`, headlineVars(save, extra.vars))}
        </p>
      ))}
    </li>
  );
}
