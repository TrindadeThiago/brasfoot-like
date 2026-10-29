"use client";

import type { FormResult } from "@brasfoot-like/engine";
import {
  divisionNameOf,
  isCareerSeasonOver,
  nextFixture,
  type SaveFile,
  userDivisionLevel,
  userSeason,
} from "@brasfoot-like/save";
import Link from "next/link";
import type { useGame } from "../game/GameProvider";
import { clubPosition } from "../game/selectors";
import { formatDate, formatWeekday, useT } from "../i18n";
import { Button } from "./Button";
import { Crest } from "./Crest";
import { phaseLabel } from "./cup/phase";
import { FormChips } from "./FormChips";
import { DerbyBadge } from "./fans/DerbyBadge";
import styles from "./NextMatchCard.module.css";
import { screenHref } from "./shell/screens";
import { stageLabel } from "./stages/label";

type Game = ReturnType<typeof useGame>;

/**
 * Primeiro bloco do Início (026): o próximo jogo em destaque, com adversário, competição, mando,
 * data, forma recente e as ações de jogar. Troca o conteúdo quando a temporada acabou ou o clube
 * não tem mais jogos.
 */
export function NextMatchCard({
  save,
  game,
  form,
  play,
}: {
  save: SaveFile;
  game: Game;
  /** Resultados recentes do clube (V, E, D), do mais novo ao mais antigo. */
  form: readonly FormResult[];
  play: (mode: "live" | "direct") => Promise<void>;
}) {
  const t = useT();
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const over = isCareerSeasonOver(save);
  const next = nextFixture(save);
  const isHome = next?.home === save.clubId;
  const opponent = next ? clubs.get(isHome ? next.away : next.home) : undefined;
  const competition = next
    ? save.bank.competitions.find((entry) => entry.id === next.competitionId)
    : undefined;
  const position = clubPosition(userSeason(save), save.bank, save.clubId);
  return (
    <section aria-label={t("home.nextMatch")} className={styles.card}>
      <h2>{t("home.nextMatch")}</h2>
      {over ? (
        <p>
          {t("home.seasonOver", {
            position,
            division: divisionNameOf(save, userDivisionLevel(save)),
          })}
        </p>
      ) : next && opponent ? (
        <div className={styles.next}>
          <Crest crest={opponent.crest} label={opponent.name} size={72} />
          <div className={styles.info}>
            <strong className={styles.opponent}>
              {opponent.name}
              <DerbyBadge rivalries={save.bank.rivalries} home={save.clubId} away={opponent.id} />
            </strong>
            <span>
              {t("home.matchWhen", {
                weekday: formatWeekday(next.date),
                date: formatDate(next.date),
              })}
            </span>
            <span>{isHome ? t("home.homeGame") : t("home.awayGame")}</span>
            <span>{t("home.competition", { competition: competition?.name ?? "" })}</span>
            {(competition?.divisions.length ?? 0) > 1 ? (
              <span>
                {t("home.division", { division: divisionNameOf(save, userDivisionLevel(save)) })}
              </span>
            ) : null}
            <span>
              {stageLabel(save, next) ??
                phaseLabel(save, next.competitionId, next.round) ??
                t("home.roundLabel", { round: next.round })}
            </span>
            {form.length > 0 ? <FormChips form={form} /> : null}
          </div>
        </div>
      ) : (
        <p>{t("home.noMoreMatches")}</p>
      )}
      <div className={styles.actions} data-tip-anchor="play">
        {next || over ? (
          <>
            <Button
              variant="primary"
              disabled={over || game.state.simulating}
              onClick={() => void play("live")}
            >
              {t("home.playLive")}
            </Button>
            <Button disabled={over || game.state.simulating} onClick={() => void play("direct")}>
              {t("home.simulate")}
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            disabled={game.state.simulating}
            onClick={() => void play("direct")}
          >
            {t("home.advanceToEnd")}
          </Button>
        )}
        {game.state.simulating ? <p role="status">{t("home.simulating")}</p> : null}
      </div>
      {over ? (
        <div className={styles.actions}>
          <Link href={screenHref("/jogo/fim-de-temporada", save.id)}>
            {t("home.seasonEndLink")}
          </Link>
          <Button variant="primary" onClick={() => void game.advanceToNextSeason()}>
            {t("home.nextSeason")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
