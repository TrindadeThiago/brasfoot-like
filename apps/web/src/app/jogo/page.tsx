"use client";

import { pendingOffers } from "@brasfoot-like/engine";
import {
  isCareerSeasonOver,
  isEmployed,
  managedClubId,
  nextFixture,
  type SaveFile,
  seasonStateOf,
  userSeason,
} from "@brasfoot-like/save";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameLayout } from "../../game/GameLayout";
import { clubPosition, lastResults } from "../../game/selectors";
import { formatMoney, useT } from "../../i18n";
import { Button } from "../../ui/Button";
import { BoardCard } from "../../ui/board/BoardCard";
import { BoardNotice } from "../../ui/board/BoardNotice";
import { JobOffers } from "../../ui/board/JobOffers";
import { Card } from "../../ui/Card";
import { Crest } from "../../ui/Crest";
import { FormChips } from "../../ui/FormChips";
import { FansCard } from "../../ui/fans/FansCard";
import { LineupNotice } from "../../ui/LineupNotice";
import { MarketNotice, marketNoticeCounts } from "../../ui/MarketNotice";
import { WindowStatus } from "../../ui/market/WindowStatus";
import { NextMatchCard } from "../../ui/NextMatchCard";
import { Notice } from "../../ui/Notice";
import { NewsCard } from "../../ui/news/NewsCard";
import { RoundResults } from "../../ui/RoundResults";
import { SectionLabel } from "../../ui/SectionLabel";
import { SquadChangeNotice } from "../../ui/SquadChangeNotice";
import { screenHref } from "../../ui/shell/screens";
import styles from "./page.module.css";

type Game = Parameters<Parameters<typeof GameLayout>[0]["children"]>[1];

/** Início do técnico desempregado (012 US4): reputação, propostas e as rodadas do mundo. */
function Unemployed({
  save,
  game,
  play,
}: {
  save: SaveFile;
  game: Game;
  play: (mode: "live" | "direct") => Promise<void>;
}) {
  const t = useT();
  const over = isCareerSeasonOver(save);
  const lastRound = game.state.lastRound;
  return (
    <div className={styles.grid}>
      {save.board.notice ? (
        <div className={styles.wide}>
          <BoardNotice save={save} onDismiss={game.dismissBoardNotice} />
        </div>
      ) : null}
      <div className={styles.wide}>
        <NewsCard save={save} />
      </div>
      <section aria-label={t("career.unemployed")} className={`${styles.card} ${styles.wide}`}>
        <h2>{t("career.unemployed")}</h2>
        <p>{t("career.unemployedDetail")}</p>
        <p>{t("career.reputation", { value: save.board.manager.reputation })}</p>
        <h2>{t("career.offers.title")}</h2>
        <JobOffers
          save={save}
          disabled={game.state.live !== undefined}
          onAccept={(offerId) => void game.acceptJobOffer(offerId)}
          onDecline={(offerId) => game.declineJobOffer(offerId)}
        />
        <div className={styles.actions} data-tip-anchor="play">
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
      {lastRound && lastRound.length > 0 ? (
        <div className={styles.wide}>
          <RoundResults
            round={lastRound[0]?.round ?? 0}
            records={lastRound}
            clubs={save.bank.clubs}
            clubId={managedClubId(save)}
            rivalries={save.bank.rivalries}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  const t = useT();
  const router = useRouter();
  return (
    <GameLayout>
      {(save, game) => {
        const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
        const _over = isCareerSeasonOver(save);
        const next = nextFixture(save);
        const isHome = next?.home === save.clubId;
        const _opponent = next ? clubs.get(isHome ? next.away : next.home) : undefined;
        const _competition = next
          ? save.bank.competitions.find((entry) => entry.id === next.competitionId)
          : undefined;
        const position = clubPosition(userSeason(save), save.bank, save.clubId);
        const results = lastResults(seasonStateOf(save), save.clubId, 5);
        const lastRound = game.state.lastRound;
        const play = async (mode: "live" | "direct") => {
          const outcome = await game.playRound(mode);
          if (outcome === "live") router.push(screenHref("/jogo/rodada", save.id));
          if (outcome === "finished") router.push(screenHref("/jogo/fim-de-temporada", save.id));
        };
        if (!isEmployed(save)) return <Unemployed save={save} game={game} play={play} />;
        const offers = pendingOffers(save.board).length;
        const market = marketNoticeCounts(save);
        const hasNotices =
          save.board.notice !== undefined ||
          offers > 0 ||
          save.finances.clubs[save.clubId]?.inCrisis === true ||
          save.renewal.squadNotice !== undefined ||
          market.offers + market.expiring > 0 ||
          market.report ||
          (save.lineupNotice?.length ?? 0) > 0;
        return (
          <div className={styles.grid}>
            <div className={styles.wide}>
              <NextMatchCard
                save={save}
                game={game}
                form={results.map((result) => result.result)}
                play={play}
              />
            </div>
            <div className={styles.wide}>
              <WindowStatus save={save} />
            </div>
            {hasNotices ? (
              <div className={`${styles.wide} ${styles.notices}`}>
                <SectionLabel>{t("home.beforeMatch")}</SectionLabel>
                {save.board.notice ? (
                  <BoardNotice save={save} onDismiss={game.dismissBoardNotice} />
                ) : null}
                {offers > 0 ? (
                  <Notice role="status" tone="info" title={t("career.offers.title")}>
                    <p>
                      {t("career.offers.notice", { count: offers })}{" "}
                      <Link href={`${screenHref("/jogo/carreira", save.id)}&aba=offers`}>
                        {t("career.offers.open")}
                      </Link>
                    </p>
                  </Notice>
                ) : null}
                {save.finances.clubs[save.clubId]?.inCrisis ? (
                  <p role="alert" className={styles.crisis}>
                    {t("home.crisis", {
                      rounds: save.finances.clubs[save.clubId]?.negativeRounds ?? 0,
                    })}
                  </p>
                ) : null}
                {save.renewal.squadNotice ? (
                  <SquadChangeNotice save={save} onDismiss={game.dismissSquadNotice} />
                ) : null}
                {market.offers + market.expiring > 0 || market.report ? (
                  <MarketNotice save={save} onDismissReport={game.dismissWindowReport} />
                ) : null}
                {save.lineupNotice && save.lineupNotice.length > 0 ? (
                  <LineupNotice save={save} onDismiss={game.dismissLineupNotice} />
                ) : null}
              </div>
            ) : null}
            <Card aria-label={t("home.position")} className={styles.card}>
              <h2>{t("home.position")}</h2>
              <p className={styles.position}>{t("home.positionValue", { position })}</p>
              <p>
                {t("home.cash", {
                  amount: formatMoney(save.finances.clubs[save.clubId]?.cash ?? 0),
                })}
              </p>
            </Card>
            <section
              aria-label={t("home.lastResults")}
              className={`${styles.card} ${styles.span2}`}
            >
              <h2>{t("home.lastResults")}</h2>
              {results.length === 0 ? (
                <p>{t("home.noResults")}</p>
              ) : (
                <>
                  <FormChips form={results.map((result) => result.result)} />
                  <ul className={styles.results}>
                    {results.map((result) => {
                      const other = clubs.get(result.opponentId);
                      const league = result.competitionId === userSeason(save).competitionId;
                      return (
                        <li key={`${result.competitionId}-${result.round}-${result.opponentId}`}>
                          <span>
                            {league
                              ? t("home.roundLabel", { round: result.round })
                              : save.bank.competitions.find(
                                  (entry) => entry.id === result.competitionId,
                                )?.name}
                          </span>
                          {other ? (
                            <Crest crest={other.crest} label={other.name} size={18} />
                          ) : null}
                          <span>{other?.shortName}</span>
                          <span>{result.isHome ? t("calendar.home") : t("calendar.away")}</span>
                          <strong>
                            {result.goalsFor} × {result.goalsAgainst}
                          </strong>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>
            <div className={styles.wide}>
              <FansCard save={save} clubId={save.clubId} />
            </div>
            <div className={styles.wide}>
              <BoardCard save={save} />
            </div>
            <div className={styles.wide}>
              <NewsCard save={save} />
            </div>
            {lastRound && lastRound.length > 0 ? (
              <div className={styles.wide}>
                <RoundResults
                  round={lastRound[0]?.round ?? 0}
                  records={lastRound}
                  clubs={save.bank.clubs}
                  clubId={save.clubId}
                  rivalries={save.bank.rivalries}
                />
              </div>
            ) : null}
          </div>
        );
      }}
    </GameLayout>
  );
}
