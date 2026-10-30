"use client";

import type { LiveMatch, Side } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { memo } from "react";
import { type MatchContext, phaseOf, sentOffOf } from "../../game/live-view";
import { useT } from "../../i18n";
import { Badge, type BadgeTone } from "../Badge";
import { Crest } from "../Crest";
import { clockText, minuteText } from "../event-text";
import { DerbyBadge } from "../fans/DerbyBadge";
import styles from "./MatchScoreboard.module.css";

const SYMBOL = { live: "●", halftime: "⏸", extraTime: "⏱", penalties: "◎", finished: "✓" } as const;
const TONE: Record<keyof typeof SYMBOL, BadgeTone> = {
  live: "accent",
  halftime: "warning",
  extraTime: "info",
  penalties: "info",
  finished: "neutral",
};

function Team({ match, save, side }: { match: LiveMatch; save: SaveFile; side: Side }) {
  const t = useT();
  const club = save.bank.clubs.find((entry) => entry.id === match.sides[side]);
  const players = new Map(save.bank.players.map((player) => [player.id, player.displayName]));
  const sent = sentOffOf(match.state).filter((entry) => entry.side === side);
  return (
    <div className={`${styles.team} ${side === "away" ? styles.away : ""}`}>
      {club ? <Crest crest={club.crest} label={club.name} size={56} /> : null}
      <strong className={styles.name}>{club?.name}</strong>
      {sent.length > 0 ? (
        <ul className={styles.sentOff}>
          {sent.map((entry) => (
            <li key={`${entry.playerId}-${entry.minute}`}>
              {t("live.sentOffName", {
                player: players.get(entry.playerId) ?? entry.playerId,
                minute: minuteText(entry),
              })}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface Props {
  match: LiveMatch;
  save: SaveFile;
  context: MatchContext;
  /** O lado do clube do jogador, para escrever "Em casa" ou "Fora de casa". */
  mine: Side;
}

function same(a: Props, b: Props): boolean {
  const left = a.match.state;
  const right = b.match.state;
  return (
    a.save === b.save &&
    a.mine === b.mine &&
    a.context.competition === b.context.competition &&
    a.context.phase === b.context.phase &&
    left.status === right.status &&
    left.score.home === right.score.home &&
    left.score.away === right.score.away &&
    left.clock.minute === right.clock.minute &&
    left.clock.stoppage === right.clock.stoppage &&
    left.events.length === right.events.length
  );
}

/** Placar de transmissão do meu jogo (030): escudos, nomes, mando, fase, placar grande e estado em texto. */
export const MatchScoreboard = memo(function MatchScoreboard({
  match,
  save,
  context,
  mine,
}: Props) {
  const t = useT();
  const phase = phaseOf(match.state);
  const stateText =
    phase === "live"
      ? t("live.state.live")
      : phase === "extraTime"
        ? t("live.state.extraTime")
        : clockText(match.state);
  const side = context.neutral
    ? t("live.side.neutral")
    : t(mine === "home" ? "live.side.home" : "live.side.away");
  return (
    <div className={styles.board}>
      <p className={styles.meta}>
        <span>{context.competition}</span>
        {context.phase ? <span>{context.phase}</span> : null}
        <span>{side}</span>
        <DerbyBadge
          rivalries={save.bank.rivalries}
          home={match.sides.home}
          away={match.sides.away}
        />
      </p>
      <div className={styles.row}>
        <Team match={match} save={save} side="home" />
        <div className={styles.center}>
          <strong className={styles.score}>
            {match.state.score.home} × {match.state.score.away}
          </strong>
          <Badge tone={TONE[phase]}>
            <span aria-hidden="true">{SYMBOL[phase]} </span>
            {stateText}
          </Badge>
          {phase === "live" || phase === "extraTime" ? (
            <span className={styles.clock}>{clockText(match.state)}</span>
          ) : null}
        </div>
        <Team match={match} save={save} side="away" />
      </div>
    </div>
  );
}, same);
