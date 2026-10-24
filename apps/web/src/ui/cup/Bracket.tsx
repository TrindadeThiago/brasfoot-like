"use client";

import { cupFormat, type Season, type Tie, type TieState, tieState } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Crest } from "../Crest";
import styles from "./Bracket.module.css";

/** Texto da forma de decisão de um confronto decidido além do agregado (ou nada). */
function decisionNote(
  t: (key: string, values?: Record<string, string | number>) => string,
  season: Season,
  state: TieState,
): string | undefined {
  if (!state.decided || state.decidedBy === undefined || state.decidedBy === "aggregate") {
    return undefined;
  }
  if (state.decidedBy === "penalties") {
    const last = season.records
      .filter((record) => record.decision?.shootout !== undefined)
      .find((record) => {
        const fixture = (season.calendar[record.round - 1]?.fixtures ?? []).find(
          (entry) => entry.home === record.home && entry.tie?.id === state.id,
        );
        return fixture !== undefined;
      });
    const shootout = last?.decision?.shootout?.score;
    const homeIsTieHome = last?.home === state.home;
    return t("cup.decision.penalties", {
      home: shootout ? (homeIsTieHome ? shootout.home : shootout.away) : 0,
      away: shootout ? (homeIsTieHome ? shootout.away : shootout.home) : 0,
    });
  }
  return t(`cup.decision.${state.decidedBy}`);
}

/** Um confronto: os dois clubes, os gols do agregado, o classificado em destaque e a decisão. */
function TieCard({
  save,
  season,
  phaseIndex,
  tie,
  originOf,
}: {
  save: SaveFile;
  season: Season;
  phaseIndex: number;
  tie: Tie;
  originOf?: (clubId: string) => string | undefined;
}) {
  const t = useT();
  const state = tieState(season, phaseIndex, tie.id);
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const note = decisionNote(t, season, state);
  const side = (clubId: string, goals: number) => {
    const club = clubs.get(clubId);
    const won = state.decided && state.winner === clubId;
    const lost = state.decided && state.loser === clubId;
    return (
      <div className={`${styles.side} ${won ? styles.winner : ""} ${lost ? styles.loser : ""}`}>
        {club ? <Crest crest={club.crest} label={club.name} size={18} /> : null}
        <span>{club?.shortName ?? clubId}</span>
        {originOf?.(clubId) ? <span className={styles.origin}>{originOf(clubId)}</span> : null}
        {state.played > 0 ? <span className={styles.goals}>{goals}</span> : null}
        {won ? <span className="visually-hidden">{t("cup.qualified")}</span> : null}
      </div>
    );
  };
  return (
    <li
      className={`${styles.tie} ${tie.home === save.clubId || tie.away === save.clubId ? styles.mine : ""}`}
    >
      {side(tie.home, state.goals.home)}
      {side(tie.away, state.goals.away)}
      {note ? <span className={styles.note}>{note}</span> : null}
    </li>
  );
}

/** Chaveamento da copa (018 US1): fases em colunas, confrontos com placar e fases ainda sem sorteio. */
export function Bracket({
  save,
  season,
  originOf,
}: {
  save: SaveFile;
  season: Season;
  /** Origem da vaga de cada clube na 1ª fase (a fase de pontos de que vieram, 019). */
  originOf?: (clubId: string) => string | undefined;
}) {
  const t = useT();
  const format = cupFormat(save.bank, season);
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: região rolável precisa de foco para o teclado (axe)
    <section aria-label={t("cup.bracket")} className={styles.bracket} tabIndex={0}>
      {(season.bracket?.phases ?? []).map((phase) => (
        <div key={phase.index} className={styles.phase}>
          <h3>{format.phases[phase.index]?.name}</h3>
          {phase.drawn ? (
            <ol>
              {phase.ties.map((tie) => (
                <TieCard
                  key={tie.id}
                  save={save}
                  season={season}
                  phaseIndex={phase.index}
                  tie={tie}
                  {...(phase.index === 0 && originOf ? { originOf } : {})}
                />
              ))}
            </ol>
          ) : (
            <p className={styles.tbd}>{t("cup.toBeDefined")}</p>
          )}
        </div>
      ))}
    </section>
  );
}
