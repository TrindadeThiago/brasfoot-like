"use client";

import type { LiveMatch } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../i18n";
import { Crest } from "./Crest";
import { clockText } from "./event-text";
import styles from "./LiveGrid.module.css";

function redCards(match: LiveMatch, side: "home" | "away"): number {
  return match.state.events.filter((event) => event.type === "red_card" && event.side === side)
    .length;
}

function MatchCard({ match, save, big }: { match: LiveMatch; save: SaveFile; big?: boolean }) {
  const t = useT();
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const home = clubs.get(match.sides.home);
  const away = clubs.get(match.sides.away);
  const clock = clockText(match.state);
  const side = (id: "home" | "away") => {
    const club = id === "home" ? home : away;
    const reds = redCards(match, id);
    return (
      <span className={`${styles.club} ${id === "away" ? styles.away : ""}`}>
        {club ? <Crest crest={club.crest} label={club.name} size={big ? 40 : 20} /> : null}
        <span className={styles.name}>{big ? club?.name : club?.shortName}</span>
        {reds > 0 ? (
          <span role="img" className={styles.red} aria-label={t("round.sentOff", { count: reds })}>
            {reds}
          </span>
        ) : null}
      </span>
    );
  };
  return (
    <div className={`${styles.card} ${big ? styles.big : ""}`}>
      {side("home")}
      <strong className={styles.score} key={`${match.state.score.home}-${match.state.score.away}`}>
        {match.state.score.home} × {match.state.score.away}
      </strong>
      {side("away")}
      <span className={styles.clock}>{clock}</span>
    </div>
  );
}

/** Jogo do jogador em destaque e os demais jogos da rodada. */
export function LiveGrid({
  matches,
  clubId,
  save,
}: {
  matches: readonly LiveMatch[];
  clubId: string;
  save: SaveFile;
}) {
  const t = useT();
  const mine = matches.find((match) => match.sides.home === clubId || match.sides.away === clubId);
  const others = matches.filter((match) => match !== mine);
  return (
    <div className={styles.grid}>
      {mine ? (
        <section aria-label={t("round.myMatch")} className={styles.mine}>
          <MatchCard match={mine} save={save} big />
        </section>
      ) : null}
      <section aria-label={t("round.otherMatches")}>
        <ul className={styles.list}>
          {others.map((match) => (
            <li key={match.fixture.home}>
              <MatchCard match={match} save={save} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
