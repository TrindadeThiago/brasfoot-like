"use client";

import { formationChange, isSeasonOver, type LiveRound, matchOf } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import type { useGame } from "../../../game/GameProvider";
import { SPEEDS, useLiveRound } from "../../../game/useLiveRound";
import { useT } from "../../../i18n";
import type { RoundSpeed } from "../../../storage/preferences";
import { screenHref } from "../../../ui/AppHeader";
import { Button } from "../../../ui/Button";
import { EventFeed } from "../../../ui/EventFeed";
import { clockText, eventText } from "../../../ui/event-text";
import { LiveGrid } from "../../../ui/LiveGrid";
import { setLeaveGuard } from "../../../ui/leave-guard";
import { MatchSummary } from "../../../ui/MatchSummary";
import { RoundResults } from "../../../ui/RoundResults";
import { SubstitutionPanel } from "../../../ui/SubstitutionPanel";
import { useShortcuts } from "../../../ui/useShortcuts";
import styles from "./page.module.css";

type Game = ReturnType<typeof useGame>;

const ANNOUNCED = new Set(["shot", "red_card", "injury"]);

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
  const shortcuts: Record<string, () => void> = {
    " ": round.toggle,
    "+": faster,
    "=": faster,
    "-": slower,
    f: round.finishNow,
  };
  useShortcuts(shortcuts);

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
      <div className={styles.controls}>
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
      <div className={styles.board}>
        <LiveGrid matches={round.live.matches} clubId={save.clubId} save={save} />
        <div className={styles.feeds}>
          <EventFeed
            title={t("round.myFeed")}
            items={round.feed.filter((item) => item.mine)}
            live={round.live}
            save={save}
          />
          <EventFeed title={t("round.feed")} items={round.feed} live={round.live} save={save} />
        </div>
      </div>
    </div>
  );
}

function RoundEnd({ save, round }: { save: SaveFile; round: number }) {
  const t = useT();
  const records = save.season.records.filter((record) => record.round === round);
  const mine = records.find((record) => record.home === save.clubId || record.away === save.clubId);
  const over = isSeasonOver(save.season);
  return (
    <div className={styles.layout}>
      <RoundResults round={round} records={records} clubs={save.bank.clubs} clubId={save.clubId} />
      {mine ? <MatchSummary record={mine} save={save} /> : null}
      <div className={styles.actions}>
        <Link href={screenHref("/jogo/competicao", save.id)}>{t("round.toStandings")}</Link>
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
  const [done, setDone] = useState<number | undefined>();
  const live = game.state.live;
  const { commitRound } = game;
  const finish = useCallback(
    (round: LiveRound) => {
      setDone(round.round);
      void commitRound(round);
    },
    [commitRound],
  );

  if (done !== undefined) return <RoundEnd save={save} round={done} />;
  if (live && live.round === save.season.nextRound) {
    return (
      <>
        <h1 className={styles.title}>{t("round.title", { round: live.round })}</h1>
        <LiveRoundView key={live.round} initial={live} save={save} onFinish={finish} />
      </>
    );
  }
  if (isSeasonOver(save.season)) {
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
        {t("round.start", { round: save.season.nextRound })}
      </Button>
    </div>
  );
}

export default function RoundPage() {
  return <GameLayout>{(save, game) => <RoundScreen save={save} game={game} />}</GameLayout>;
}
