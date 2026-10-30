"use client";

import { competitionSeason, formationChange, type LiveRound, matchOf } from "@brasfoot-like/engine";
import {
  currentDayOf,
  divisionNameOf,
  isCareerSeasonOver,
  nextFixture,
  type SaveFile,
  seasonStateOf,
  userSeasonFor,
} from "@brasfoot-like/save";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import type { useGame } from "../../../game/GameProvider";
import { matchContext, otherMatchRows, shootoutWinner } from "../../../game/live-view";
import { divisionHref } from "../../../game/useDivision";
import { type FeedItem, SPEEDS, useLiveRound } from "../../../game/useLiveRound";
import { formatDate, useT } from "../../../i18n";
import { Button } from "../../../ui/Button";
import { ShootoutPanel } from "../../../ui/cup/ShootoutPanel";
import { EventFeed } from "../../../ui/EventFeed";
import { eventText } from "../../../ui/event-text";
import { LiveStats } from "../../../ui/LiveStats";
import { requestLeave, setLeaveGuard } from "../../../ui/leave-guard";
import { ControlBar } from "../../../ui/live/ControlBar";
import { ExtraTimeNotice } from "../../../ui/live/ExtraTimeNotice";
import { LeaveDialog } from "../../../ui/live/LeaveDialog";
import { MatchScoreboard } from "../../../ui/live/MatchScoreboard";
import { OtherMatches } from "../../../ui/live/OtherMatches";
import { ProgressBar } from "../../../ui/live/ProgressBar";
import { MatchSummary } from "../../../ui/MatchSummary";
import { RoundResults } from "../../../ui/RoundResults";
import { SubstitutionPanel } from "../../../ui/SubstitutionPanel";
import { screenHref } from "../../../ui/shell/screens";
import { useShortcuts } from "../../../ui/useShortcuts";
import styles from "./page.module.css";

type Game = ReturnType<typeof useGame>;

/** Quantos anúncios ficam na região de leitor de tela (os mais novos). */
const ANNOUNCEMENT_LINES = 20;

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
  const [announced, setAnnounced] = useState<{ key: string; text: string }[]>([]);
  const saveRef = useRef(save);
  saveRef.current = save;
  // Os lances do meu jogo que o leitor de tela deve ouvir, todos os do lote e em ordem (030 R7).
  const announce = useCallback((items: FeedItem[], next: LiveRound) => {
    const lines = items.flatMap((item) => {
      const match = next.matches[item.matchIndex];
      const text = match ? eventText(item.event, match, saveRef.current) : undefined;
      return text ? [{ key: item.key, text }] : [];
    });
    if (lines.length > 0)
      setAnnounced((current) => [...current, ...lines].slice(-ANNOUNCEMENT_LINES));
  }, []);
  const round = useLiveRound(initial, save.clubId, onFinish, announce);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  // Ao retomar o painel some: se o foco estava dentro dele, volta ao botão Pausar (030 R6).
  useEffect(() => {
    if (!round.paused && document.activeElement === document.body) toggleRef.current?.focus();
  }, [round.paused]);
  const mine = matchOf(round.live, save.clubId);
  const others = useMemo(() => otherMatchRows(round.live, save, save.clubId), [round.live, save]);

  const router = useRouter();
  const [asking, setAsking] = useState<((ok: boolean) => void) | undefined>();
  const wasRunning = useRef(false);
  const pausedRef = useRef(round.paused);
  pausedRef.current = round.paused;
  const pauseRef = useRef(round.pause);
  pauseRef.current = round.pause;
  useEffect(() => {
    if (round.finished) return;
    // A pergunta pausa a rodada; se o jogador ficar, ela volta a correr (030 R8).
    setLeaveGuard(t("round.confirmLeave"), (answer) => {
      wasRunning.current = !pausedRef.current;
      pauseRef.current();
      setAsking(() => answer);
    });
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

  return (
    <div className={styles.layout}>
      <ControlBar
        speed={round.speed}
        paused={round.paused}
        finished={round.finished}
        autoPause={round.autoPause}
        toggleRef={toggleRef}
        onSpeed={round.setSpeed}
        onToggle={round.toggle}
        onFinishNow={round.finishNow}
        onAutoPause={round.setAutoPause}
        onLeave={() =>
          void requestLeave().then((ok) => ok && router.push(screenHref("/jogo", save.id)))
        }
      />
      <LeaveDialog
        open={asking !== undefined}
        message={t("round.confirmLeave")}
        onAnswer={(ok) => {
          asking?.(ok);
          setAsking(undefined);
          // Cancelou: a rodada volta a correr se ela estava correndo antes da pergunta.
          if (!ok && wasRunning.current) round.resume();
        }}
      />
      {mine ? <ProgressBar match={mine.match} save={save} /> : null}
      <div role="log" aria-relevant="additions" className={styles.visuallyHidden}>
        {announced.map((line) => (
          <p key={line.key}>{line.text}</p>
        ))}
      </div>
      {mine ? (
        <section aria-label={t("round.myMatch")}>
          <MatchScoreboard
            match={mine.match}
            save={save}
            context={matchContext(save, round.live, mine.match)}
            mine={mine.side}
          />
        </section>
      ) : null}
      {mine?.match.state.extraTime ? <ExtraTimeNotice /> : null}
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
        <div className={styles.feeds}>
          <EventFeed title={t("round.myFeed")} items={round.feed} live={round.live} save={save} />
          {mine?.match.state.shootout ? (
            <ShootoutPanel
              save={save}
              home={mine.match.sides.home}
              away={mine.match.sides.away}
              kicks={mine.match.state.shootout.kicks}
              score={mine.match.state.shootout.score}
              winner={shootoutWinner(mine.match.state)}
            />
          ) : null}
        </div>
        {mine ? <LiveStats match={mine.match} save={save} /> : null}
      </div>
      <OtherMatches rows={others} />
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
