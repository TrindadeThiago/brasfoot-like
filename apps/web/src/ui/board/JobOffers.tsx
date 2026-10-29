"use client";

import {
  clubDivision,
  currentPosition,
  mainLeagueOfClub,
  pendingOffers,
  playedRounds,
} from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile, seasonStateOf } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Button } from "../Button";
import { Crest } from "../Crest";
import { EmptyState } from "../EmptyState";
import { Notice } from "../Notice";
import styles from "./board.module.css";
import { goalTierText } from "./GoalsList";

/**
 * Propostas de emprego pendentes (029): um cartão por proposta com o que é preciso para decidir; o
 * aviso de mudança de país vem antes de Aceitar e Recusar (US4, US6, FR-025).
 */
export function JobOffers({
  save,
  onAccept,
  onDecline,
  disabled,
}: {
  save: SaveFile;
  onAccept: (offerId: string) => void;
  onDecline: (offerId: string) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const offers = pendingOffers(save.board);
  if (offers.length === 0) {
    return (
      <EmptyState title={t("career.offers.empty")}>
        {t("career.offers.emptyDetail", { value: save.board.manager.reputation })}
      </EmptyState>
    );
  }
  const state = seasonStateOf(save);
  const countryOf = (clubId: string) =>
    save.bank.clubs.find((entry) => entry.id === clubId)?.countryId;
  const countryName = (id: string | undefined) =>
    save.bank.countries.find((entry) => entry.id === id)?.name ?? id ?? "";
  const home = countryOf(save.clubId);
  return (
    <div className={styles.layout}>
      {disabled ? (
        <p role="status" className={styles.muted}>
          {t("career.offers.locked")}
        </p>
      ) : null}
      <div className={styles.offers}>
        {offers.map((offer) => {
          const club = save.bank.clubs.find((entry) => entry.id === offer.clubId);
          // A liga do clube da proposta: pode ser a de outro país (020).
          const league = mainLeagueOfClub(state, offer.clubId) ?? save.league;
          const level = clubDivision(league, offer.clubId)?.divisionLevel ?? 1;
          const position = currentPosition({ world: save.bank, league }, offer.clubId);
          const played = playedRounds(league);
          const abroad = club !== undefined && club.countryId !== home;
          return (
            <article key={offer.id} className={styles.offer} aria-label={club?.name}>
              <div className={styles.offerClub}>
                {club ? <Crest crest={club.crest} label={club.name} size={32} /> : null}
                <strong>{club?.name}</strong>
              </div>
              <ul className={styles.list}>
                <li>
                  {t("career.offers.division", {
                    division: divisionNameOf(save, level, league.competitionId),
                    position,
                  })}
                </li>
                {abroad ? (
                  <li>{t("career.offers.country", { country: countryName(club?.countryId) })}</li>
                ) : null}
                <li>{t("career.offers.reputation", { value: club?.reputation ?? 0 })}</li>
                <li>
                  {t("career.offers.goals", {
                    goal: goalTierText(
                      t,
                      save,
                      offer.goals.sport.tier,
                      offer.goals.sport.competitionId,
                    ),
                  })}
                </li>
                <li className={styles.muted}>
                  {t("career.offers.expires", {
                    rounds: Math.max(0, offer.expiresRound - played),
                  })}
                </li>
              </ul>
              {abroad ? (
                <Notice tone="warning" title={t("career.offers.abroadTitle")}>
                  <p>{t("career.offers.abroad", { country: countryName(club?.countryId) })}</p>
                </Notice>
              ) : null}
              <div className={styles.actions}>
                <Button variant="primary" disabled={disabled} onClick={() => onAccept(offer.id)}>
                  {t("career.offers.accept")}
                </Button>
                <Button disabled={disabled} onClick={() => onDecline(offer.id)}>
                  {t("career.offers.decline")}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
