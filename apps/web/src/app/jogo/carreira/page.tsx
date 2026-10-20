"use client";

import { pendingOffers } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile, userDivisionLevel } from "@brasfoot-like/save";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import type { useGame } from "../../../game/GameProvider";
import { useT } from "../../../i18n";
import { Button } from "../../../ui/Button";
import styles from "../../../ui/board/board.module.css";
import { CoachesTable } from "../../../ui/board/CoachesTable";
import { ConfidenceMeter } from "../../../ui/board/ConfidenceMeter";
import { GoalsList } from "../../../ui/board/GoalsList";
import { JobOffers } from "../../../ui/board/JobOffers";
import { ManagerHistory } from "../../../ui/board/ManagerHistory";

type Game = ReturnType<typeof useGame>;
type Tab = "board" | "offers" | "history" | "coaches";
const TABS: readonly Tab[] = ["board", "offers", "history", "coaches"];

function BoardTab({ save }: { save: SaveFile }) {
  const t = useT();
  const { manager } = save.board;
  const club = manager.clubId ? save.board.clubs[manager.clubId] : undefined;
  if (!club) {
    return (
      <section className={styles.card}>
        <h2>{t("career.unemployed")}</h2>
        <p>{t("career.unemployedDetail")}</p>
        <p>{t("career.reputation", { value: manager.reputation })}</p>
      </section>
    );
  }
  const changes = [...club.recent].reverse();
  return (
    <div className={styles.columns}>
      <section className={styles.card}>
        <h2>{t("board.goals")}</h2>
        <GoalsList save={save} />
        <p>{t("career.reputation", { value: manager.reputation })}</p>
        {manager.noFiring ? <p className={styles.muted}>{t("board.noFiring")}</p> : null}
      </section>
      <section className={styles.card}>
        <h2>{t("board.confidenceLabel")}</h2>
        <ConfidenceMeter value={club.confidence} recent={club.recent} />
        <h3>{t("board.history")}</h3>
        <ul className={styles.list}>
          {changes.map((change) => (
            <li key={`${change.season}-${change.round}-${change.value}`}>
              {t("board.historyRound", { round: change.round })}:{" "}
              {t("board.historyValue", { value: change.value, delta: change.delta })} —{" "}
              {change.factors
                .map((factor) => t(`board.factor.${factor.kind}`, { amount: factor.amount }))
                .join(", ")}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Career({ save, game }: { save: SaveFile; game: Game }) {
  const t = useT();
  // `?aba=offers` abre as propostas (link do aviso da Início).
  const requested = useSearchParams().get("aba");
  const [tab, setTab] = useState<Tab>(TABS.find((name) => name === requested) ?? "board");
  const levels = save.league.divisions.map((season) => season.divisionLevel);
  const [level, setLevel] = useState(userDivisionLevel(save));
  const offers = pendingOffers(save.board).length;
  const locked = game.state.live !== undefined;
  return (
    <div className={styles.layout}>
      <h1>{t("career.title")}</h1>
      <div className={styles.tabs} role="tablist" aria-label={t("career.tablist")}>
        {TABS.map((name) => (
          <Button
            key={name}
            role="tab"
            aria-selected={tab === name}
            variant={tab === name ? "primary" : "secondary"}
            onClick={() => setTab(name)}
          >
            {name === "offers" && offers > 0
              ? `${t(`career.tab.${name}`)} (${offers})`
              : t(`career.tab.${name}`)}
          </Button>
        ))}
      </div>
      {tab === "board" ? <BoardTab save={save} /> : null}
      {tab === "offers" ? (
        <section className={styles.card}>
          <h2>{t("career.offers.title")}</h2>
          <JobOffers
            save={save}
            disabled={locked}
            onAccept={(offerId) => void game.acceptJobOffer(offerId)}
            onDecline={(offerId) => game.declineJobOffer(offerId)}
          />
        </section>
      ) : null}
      {tab === "history" ? <ManagerHistory save={save} /> : null}
      {tab === "coaches" ? (
        <>
          <div className={styles.tabs}>
            {levels.map((entry) => (
              <Button
                key={entry}
                aria-pressed={entry === level}
                variant={entry === level ? "primary" : "secondary"}
                onClick={() => setLevel(entry)}
              >
                {divisionNameOf(save, entry)}
              </Button>
            ))}
          </div>
          <CoachesTable save={save} level={level} />
        </>
      ) : null}
    </div>
  );
}

export default function CareerPage() {
  return <GameLayout>{(save, game) => <Career save={save} game={game} />}</GameLayout>;
}
