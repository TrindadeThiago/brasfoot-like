"use client";

import { isLeagueSeasonOver, leagueRound, leagueTotalRounds } from "@brasfoot-like/engine";
import { divisionNameOf, userDivisionLevel, userSeason } from "@brasfoot-like/save";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameLayout } from "../../game/GameLayout";
import { clubPosition, lastResults, nextFixture } from "../../game/selectors";
import { formatMoney, useT } from "../../i18n";
import { screenHref } from "../../ui/AppHeader";
import { Button } from "../../ui/Button";
import { Crest } from "../../ui/Crest";
import { FormChips } from "../../ui/FormChips";
import { LineupNotice } from "../../ui/LineupNotice";
import { MarketNotice, marketNoticeCounts } from "../../ui/MarketNotice";
import { RoundResults } from "../../ui/RoundResults";
import { SquadChangeNotice } from "../../ui/SquadChangeNotice";
import styles from "./page.module.css";

export default function HomePage() {
  const t = useT();
  const router = useRouter();
  return (
    <GameLayout>
      {(save, game) => {
        const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
        const over = isLeagueSeasonOver(save.league);
        const next = nextFixture(userSeason(save), save.clubId);
        const opponent = next ? clubs.get(next.opponentId) : undefined;
        const position = clubPosition(userSeason(save), save.bank, save.clubId);
        const results = lastResults(userSeason(save), save.clubId, 5);
        const lastRound = game.state.lastRound;
        const play = async (mode: "live" | "direct") => {
          const last = leagueRound(save.league) === leagueTotalRounds(save.league);
          const outcome = await game.playRound(mode);
          if (outcome === "live") router.push(screenHref("/jogo/rodada", save.id));
          if (outcome === "done" && last) {
            router.push(screenHref("/jogo/fim-de-temporada", save.id));
          }
        };
        return (
          <div className={styles.grid}>
            {save.finances.clubs[save.clubId]?.inCrisis ? (
              <p role="alert" className={`${styles.wide} ${styles.crisis}`}>
                {t("home.crisis", {
                  rounds: save.finances.clubs[save.clubId]?.negativeRounds ?? 0,
                })}
              </p>
            ) : null}
            {save.renewal.squadNotice ? (
              <div className={styles.wide}>
                <SquadChangeNotice save={save} onDismiss={game.dismissSquadNotice} />
              </div>
            ) : null}
            {marketNoticeCounts(save).offers + marketNoticeCounts(save).expiring > 0 ||
            marketNoticeCounts(save).report ? (
              <div className={styles.wide}>
                <MarketNotice save={save} onDismissReport={game.dismissWindowReport} />
              </div>
            ) : null}
            {save.lineupNotice && save.lineupNotice.length > 0 ? (
              <div className={styles.wide}>
                <LineupNotice save={save} onDismiss={game.dismissLineupNotice} />
              </div>
            ) : null}
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
                  <Crest crest={opponent.crest} label={opponent.name} size={56} />
                  <div>
                    <strong>{opponent.name}</strong>
                    <span>{next.isHome ? t("home.homeGame") : t("home.awayGame")}</span>
                    <span>
                      {t("home.division", {
                        division: divisionNameOf(save, userDivisionLevel(save)),
                      })}
                    </span>
                    <span>{t("home.roundLabel", { round: next.round })}</span>
                  </div>
                </div>
              ) : null}
              <div className={styles.actions}>
                <Button variant="primary" disabled={over} onClick={() => void play("live")}>
                  {t("home.playLive")}
                </Button>
                <Button disabled={over} onClick={() => void play("direct")}>
                  {t("home.simulate")}
                </Button>
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
            <section aria-label={t("home.position")} className={styles.card}>
              <h2>{t("home.position")}</h2>
              <p className={styles.position}>{t("home.positionValue", { position })}</p>
              <p>
                {t("home.cash", {
                  amount: formatMoney(save.finances.clubs[save.clubId]?.cash ?? 0),
                })}
              </p>
            </section>
            <section aria-label={t("home.lastResults")} className={styles.card}>
              <h2>{t("home.lastResults")}</h2>
              {results.length === 0 ? (
                <p>{t("home.noResults")}</p>
              ) : (
                <>
                  <FormChips form={results.map((result) => result.result)} />
                  <ul className={styles.results}>
                    {results.map((result) => {
                      const other = clubs.get(result.opponentId);
                      return (
                        <li key={result.round}>
                          <span>{t("home.roundLabel", { round: result.round })}</span>
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
            {lastRound && lastRound.length > 0 ? (
              <div className={styles.wide}>
                <RoundResults
                  round={lastRound[0]?.round ?? 0}
                  records={lastRound}
                  clubs={save.bank.clubs}
                  clubId={save.clubId}
                />
              </div>
            ) : null}
          </div>
        );
      }}
    </GameLayout>
  );
}
