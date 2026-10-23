"use client";

import type { MatchRecord, Side } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../i18n";
import { minuteText } from "./event-text";
import styles from "./MatchHighlights.module.css";

const SIDES: readonly Side[] = ["home", "away"];

/**
 * Gols (autor e minuto) e total de cartões de cada time, em poucas linhas curtas (calendário);
 * quem levou cada cartão fica no texto do selo e no resumo completo do jogo.
 */
export function MatchHighlights({ record, save }: { record: MatchRecord; save: SaveFile }) {
  const t = useT();
  const players = new Map(save.bank.players.map((player) => [player.id, player.displayName]));
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const name = (id: string) => players.get(id) ?? id;
  const lines = SIDES.map((side) => {
    const goals: string[] = [];
    const yellows: string[] = [];
    const reds: string[] = [];
    for (const event of record.events) {
      if (!("side" in event) || event.side !== side) continue;
      if (event.type === "shot" && event.outcome === "goal") {
        goals.push(
          `${name(event.playerId)} ${minuteText(event)}${
            event.kind === "penalty" ? ` (${t("highlights.penalty")})` : ""
          }`,
        );
      } else if (event.type === "yellow_card") {
        yellows.push(`${name(event.playerId)} ${minuteText(event)}`);
      } else if (event.type === "red_card") {
        reds.push(`${name(event.playerId)} ${minuteText(event)}`);
      }
    }
    const club = clubs.get(side === "home" ? record.home : record.away);
    return { side, club: club?.shortName ?? "", goals, yellows, reds };
  });
  const quiet = (line: (typeof lines)[number]) =>
    line.goals.length === 0 && line.yellows.length === 0 && line.reds.length === 0;
  if (lines.every(quiet)) return <span className={styles.none}>—</span>;
  const cards = (list: string[], red: boolean) =>
    list.length === 0 ? null : (
      <span className={styles.cards} title={list.join(", ")}>
        <span
          role="img"
          aria-label={t(red ? "highlights.red" : "highlights.yellow")}
          className={`${styles.mark} ${red ? styles.red : styles.yellow}`}
        />
        {list.length}
      </span>
    );
  return (
    <ul className={styles.highlights}>
      {lines.map((line) =>
        quiet(line) ? null : (
          <li key={line.side}>
            <strong>{line.club}</strong>
            {line.goals.length > 0 ? (
              <span title={t("highlights.goals")}> {line.goals.join(", ")}</span>
            ) : null}
            {cards(line.yellows, false)}
            {cards(line.reds, true)}
          </li>
        ),
      )}
    </ul>
  );
}
