"use client";

import type { MatchRecord, Side } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../i18n";
import { minuteText } from "./event-text";
import styles from "./MatchHighlights.module.css";

const SIDES: readonly Side[] = ["home", "away"];

/** Gols e cartões de uma partida já disputada, por time, em poucas linhas (calendário). */
export function MatchHighlights({ record, save }: { record: MatchRecord; save: SaveFile }) {
  const t = useT();
  const players = new Map(save.bank.players.map((player) => [player.id, player.displayName]));
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const name = (id: string) => players.get(id) ?? id;
  const lines = SIDES.map((side) => {
    const goals: string[] = [];
    const cards: { text: string; red: boolean }[] = [];
    for (const event of record.events) {
      if (!("side" in event) || event.side !== side) continue;
      if (event.type === "shot" && event.outcome === "goal") {
        goals.push(
          `${name(event.playerId)} ${minuteText(event)}${
            event.kind === "penalty" ? ` (${t("highlights.penalty")})` : ""
          }`,
        );
      } else if (event.type === "yellow_card") {
        cards.push({ text: `${name(event.playerId)} ${minuteText(event)}`, red: false });
      } else if (event.type === "red_card") {
        cards.push({ text: `${name(event.playerId)} ${minuteText(event)}`, red: true });
      }
    }
    const club = clubs.get(side === "home" ? record.home : record.away);
    return { side, club: club?.shortName ?? "", goals, cards };
  });
  if (lines.every((line) => line.goals.length === 0 && line.cards.length === 0)) {
    return <span className={styles.none}>—</span>;
  }
  return (
    <ul className={styles.highlights}>
      {lines.map((line) =>
        line.goals.length === 0 && line.cards.length === 0 ? null : (
          <li key={line.side}>
            <strong>{line.club}</strong>
            {line.goals.length > 0 ? (
              <span title={t("highlights.goals")}> {line.goals.join(", ")}</span>
            ) : null}
            {line.cards.map((card) => (
              <span key={card.text} className={styles.card}>
                <span
                  role="img"
                  aria-label={t(card.red ? "highlights.red" : "highlights.yellow")}
                  className={`${styles.mark} ${card.red ? styles.red : styles.yellow}`}
                />
                {card.text}
              </span>
            ))}
          </li>
        ),
      )}
    </ul>
  );
}
