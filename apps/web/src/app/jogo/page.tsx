"use client";

import { isSeasonOver } from "@brasfoot-like/engine";
import { GameLayout } from "../../game/GameLayout";
import { clubPosition, lastResults, nextFixture } from "../../game/selectors";
import { useT } from "../../i18n";
import { Button } from "../../ui/Button";
import { Crest } from "../../ui/Crest";
import { FormChips } from "../../ui/FormChips";
import { RoundResults } from "../../ui/RoundResults";
import styles from "./page.module.css";

export default function HomePage() {
  const t = useT();
  return (
    <GameLayout>
      {(save, game) => {
        const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
        const over = isSeasonOver(save.season);
        const next = nextFixture(save.season, save.clubId);
        const opponent = next ? clubs.get(next.opponentId) : undefined;
        const position = clubPosition(save.season, save.bank, save.clubId);
        const results = lastResults(save.season, save.clubId, 5);
        const lastRound = game.state.lastRound;
        return (
          <div className={styles.grid}>
            <section aria-label={t("home.nextMatch")} className={styles.card}>
              <h2>{t("home.nextMatch")}</h2>
              {over ? (
                <p>{t("home.seasonOver", { position })}</p>
              ) : next && opponent ? (
                <div className={styles.next}>
                  <Crest crest={opponent.crest} label={opponent.name} size={56} />
                  <div>
                    <strong>{opponent.name}</strong>
                    <span>{next.isHome ? t("home.homeGame") : t("home.awayGame")}</span>
                    <span>{t("home.roundLabel", { round: next.round })}</span>
                  </div>
                </div>
              ) : null}
              <Button
                variant="primary"
                disabled={over}
                onClick={() => void game.simulateNextRound()}
              >
                {t("home.simulate")}
              </Button>
            </section>
            <section aria-label={t("home.position")} className={styles.card}>
              <h2>{t("home.position")}</h2>
              <p className={styles.position}>{t("home.positionValue", { position })}</p>
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
