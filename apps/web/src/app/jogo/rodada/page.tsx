"use client";

import { competitionSeason, formationChange, type LiveRound, matchOf } from "@brasfoot-like/engine";
import {
  currentDayOf,
  divisionNameOf,
  isCareerSeasonOver,
  nextFixture,
  type SaveFile,
  seasonStateOf,
  userDivisionLevel,
  userSeasonFor,
} from "@brasfoot-like/save";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import type { useGame } from "../../../game/GameProvider";
import { divisionHref } from "../../../game/useDivision";
import { SPEEDS, useLiveRound } from "../../../game/useLiveRound";
import { formatDate, useT } from "../../../i18n";
import type { RoundSpeed } from "../../../storage/preferences";
import { Button } from "../../../ui/Button";
import { ShootoutPanel } from "../../../ui/cup/ShootoutPanel";
import { EventFeed } from "../../../ui/EventFeed";
import { clockText, eventText } from "../../../ui/event-text";
import { LiveGrid } from "../../../ui/LiveGrid";
import { LiveStats } from "../../../ui/LiveStats";
import { setLeaveGuard } from "../../../ui/leave-guard";
import { MatchSummary } from "../../../ui/MatchSummary";
import { RoundResults } from "../../../ui/RoundResults";
import { SubstitutionPanel } from "../../../ui/SubstitutionPanel";
import { screenHref } from "../../../ui/shell/screens";
import { useShortcuts } from "../../../ui/useShortcuts";
import styles from "./page.module.css";

type Game = ReturnType<typeof useGame>;

const ANNOUNCED = new Set(["shot", "red_card", "injury", "shootout_kick"]);

function LiveRoundView({
  initial,
  save,
  onFinish,
}: {
  initial: LiveRound;
  save: SaveFile;
  onFinish: (round: LiveRound) => void;
}) {
  const t = useT();
  const round = useLiveRound(initial, save.clubId, onFinish);
  const mine = matchOf(round.live, save.clubId);
  // Só os jogos da divisão do jogador aparecem; os demais avançam junto (research.md R2).
  const level = userDivisionLevel(save);
  const shownLevel = round.live.matches.some((match) => match.divisionLevel === level)
    ? level
    : round.live.matches[0]?.divisionLevel;
  const shown = (index: number) => round.live.matches[index]?.divisionLevel === shownLevel;

  useEffect(() => {
    if (round.finished) return;
    setLeaveGuard(t("round.confirmLeave"));
    const onUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      setLeaveGuard(undefined);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [round.finished, t]);

  const faster = () =>
    round.setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(round.speed) + 1)] ?? "fast");
  const slower = () =>
    round.setSpeed(SPEEDS[Math.max(0, SPEEDS.indexOf(round.speed) - 1)] ?? "slow");
  useShortcuts({ pause: round.toggle, faster, slower, finish: round.finishNow });

  const announcement = useMemo(() => {
    const item = round.feed.find(
      (entry) =>
        entry.mine &&
        ANNOUNCED.has(entry.event.type) &&
        (entry.event.type !== "shot" || entry.event.outcome === "goal"),
    );
    const match = item ? round.live.matches[item.matchIndex] : undefined;
    return item && match ? (eventText(item.event, match, save) ?? "") : "";
  }, [round.feed, round.live, save]);

  return (
    <div className={styles.layout}>
      <div className={styles.controls} data-tip-anchor="round-controls">
        <span className={styles.clock}>{mine ? clockText(mine.match.state) : ""}</span>
        <label className={styles.field}>
          <span>{t("round.speed")}</span>
          <select
            value={round.speed}
            onChange={(event) => round.setSpeed(event.target.value as RoundSpeed)}
          >
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {t(`round.speed.${speed}`)}
              </option>
            ))}
          </select>
        </label>
        <Button variant="primary" onClick={round.toggle} disabled={round.finished}>
          {round.paused ? t("round.resume") : t("round.pause")}
        </Button>
        <Button onClick={round.finishNow} disabled={round.finished}>
          {t("round.finishNow")}
        </Button>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={round.autoPause}
            onChange={(event) => round.setAutoPause(event.target.checked)}
          />
          <span>{t("round.autoPause")}</span>
        </label>
      </div>
      <div aria-live="polite" className={styles.visuallyHidden}>
        {announcement}
      </div>
      {round.paused && mine ? (
        <SubstitutionPanel
          match={mine.match}
          side={mine.side}
          save={save}
          onChange={(change) =>
            change.type === "formationId"
              ? round.applyDecision(
                  formationChange(round.live, save.clubId, change.formation, save.bank),
                )
              : round.applyDecision(change)
          }
        />
      ) : null}
      {mine?.match.state.extraTime ? (
        <p role="status" className={styles.notice}>
          {t("cup.extraTimeNotice")}
        </p>
      ) : null}
      {mine?.match.state.shootout ? (
        <ShootoutPanel
          save={save}
          home={mine.match.sides.home}
          away={mine.match.sides.away}
          kicks={mine.match.state.shootout.kicks}
          score={mine.match.state.shootout.score}
        />
      ) : null}
      {mine ? <LiveStats match={mine.match} save={save} /> : null}
      <div className={styles.board}>
        <LiveGrid
          matches={round.live.matches.filter((match) => match.divisionLevel === shownLevel)}
          clubId={save.clubId}
          save={save}
        />
        <div className={styles.feeds}>
          <EventFeed
            title={t("round.myFeed")}
            items={round.feed.filter((item) => item.mine)}
            live={round.live}
            save={save}
          />
          <EventFeed
            title={t("round.feed")}
            items={round.feed.filter((item) => shown(item.matchIndex))}
            live={round.live}
            save={save}
          />
        </div>
      </div>
    </div>
  );
}

function RoundEnd({
  save,
  round,
  competitionId,
}: {
  save: SaveFile;
  round: number;
  competitionId: string;
}) {
  const t = useT();
  const season = userSeasonFor(save, competitionId);
  const records = season?.records.filter((record) => record.round === round) ?? [];
  const mine = records.find((record) => record.home === save.clubId || record.away === save.clubId);
  const over = isCareerSeasonOver(save);
  return (
    <div className={styles.layout}>
      <RoundResults
        round={round}
        records={records}
        clubs={save.bank.clubs}
        clubId={save.clubId}
        rivalries={save.bank.rivalries}
      />
      {mine ? <MatchSummary record={mine} save={save} /> : null}
      <div className={styles.actions}>
        <Link
          href={divisionHref(
            "/jogo/competicao",
            save.id,
            userSeasonFor(save, competitionId)?.divisionLevel ?? 1,
            competitionId,
          )}
        >
          {t("round.toStandings")}
        </Link>
        {competitionSeason(seasonStateOf(save), competitionId)
          .divisions.filter(
            (season) =>
              season.divisionLevel !== userSeasonFor(save, competitionId)?.divisionLevel &&
              season.records.some((record) => record.round === round),
          )
          .map((season) => (
            <Link
              key={season.divisionLevel}
              href={`${divisionHref("/jogo/competicao/resultados", save.id, season.divisionLevel, competitionId)}&r=${round}`}
            >
              {t("round.otherDivisionResults", {
                division: divisionNameOf(save, season.divisionLevel, competitionId),
              })}
            </Link>
          ))}
        {over ? (
          <Link href={screenHref("/jogo/fim-de-temporada", save.id)}>{t("round.toSeasonEnd")}</Link>
        ) : (
          <Link href={screenHref("/jogo", save.id)}>{t("round.toHome")}</Link>
        )}
      </div>
    </div>
  );
}

function RoundScreen({ save, game }: { save: SaveFile; game: Game }) {
  const t = useT();
  const [done, setDone] = useState<{ round: number; competitionId: string } | undefined>();
  const live = game.state.live;
  const { commitRound } = game;
  const finish = useCallback(
    (round: LiveRound) => {
      setDone({
        round: round.round,
        competitionId: round.competitionId ?? save.league.competitionId,
      });
      void commitRound(round);
    },
    [commitRound, save.league.competitionId],
  );

  if (done !== undefined) {
    return <RoundEnd save={save} round={done.round} competitionId={done.competitionId} />;
  }
  if (live && live.date !== undefined && live.date === currentDayOf(save)?.date) {
    return (
      <>
        <h2 className={styles.title}>{t("round.title", { round: live.round })}</h2>
        <p className={styles.note}>
          {t("round.dated", {
            competition:
              save.bank.competitions.find((entry) => entry.id === live.competitionId)?.name ?? "",
            date: formatDate(live.date),
          })}
        </p>
        <LiveRoundView
          key={`${live.competitionId}-${live.round}`}
          initial={live}
          save={save}
          onFinish={finish}
        />
      </>
    );
  }
  if (isCareerSeasonOver(save)) {
    return (
      <p className={styles.note}>
        <Link href={screenHref("/jogo/fim-de-temporada", save.id)}>{t("home.seasonEndLink")}</Link>
      </p>
    );
  }
  return (
    <div className={styles.note}>
      <p>{t("round.notStarted")}</p>
      <Button variant="primary" onClick={() => void game.playRound("live")}>
        {t("round.start", { round: nextFixture(save)?.round ?? 0 })}
      </Button>
    </div>
  );
}

export default function RoundPage() {
  return <GameLayout>{(save, game) => <RoundScreen save={save} game={game} />}</GameLayout>;
}
