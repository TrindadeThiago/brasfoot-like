"use client";

import { clubDivision, currentPosition, pendingOffers, playedRounds } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Button } from "../Button";
import { Crest } from "../Crest";
import styles from "./board.module.css";

/** Propostas de emprego pendentes, com aceitar/recusar (US4, US6, FR-025). */
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
  if (offers.length === 0) return <p>{t("career.offers.empty")}</p>;
  const played = playedRounds(save.league);
  return (
    <div className={styles.offers}>
      {offers.map((offer) => {
        const club = save.bank.clubs.find((entry) => entry.id === offer.clubId);
        const level = clubDivision(save.league, offer.clubId)?.divisionLevel ?? 1;
        const position = currentPosition({ world: save.bank, league: save.league }, offer.clubId);
        return (
          <article key={offer.id} className={styles.offer} aria-label={club?.name}>
            <div className={styles.offerClub}>
              {club ? <Crest crest={club.crest} label={club.name} size={32} /> : null}
              <strong>{club?.name}</strong>
            </div>
            <span>
              {t("career.offers.division", {
                division: divisionNameOf(save, level),
                position,
              })}
            </span>
            <span>{t("career.offers.reputation", { value: club?.reputation ?? 0 })}</span>
            <span>
              {t("career.offers.goals", { goal: t(`board.goal.tier.${offer.goals.sport.tier}`) })}
            </span>
            <span className={styles.muted}>
              {t("career.offers.expires", {
                rounds: Math.max(0, offer.expiresRound - played),
              })}
            </span>
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
  );
}
