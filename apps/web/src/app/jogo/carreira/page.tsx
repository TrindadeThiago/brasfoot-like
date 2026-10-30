"use client";

import { pendingOffers } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile, userDivisionLevel } from "@brasfoot-like/save";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import type { useGame } from "../../../game/GameProvider";
import { useT } from "../../../i18n";
import { Button } from "../../../ui/Button";
import styles from "../../../ui/board/board.module.css";
import { CoachesTable } from "../../../ui/board/CoachesTable";
import { ConfidenceChanges } from "../../../ui/board/ConfidenceChanges";
import { ConfidenceMeter } from "../../../ui/board/ConfidenceMeter";
import { GoalsList } from "../../../ui/board/GoalsList";
import { JobOffers } from "../../../ui/board/JobOffers";
import { ManagerHistory } from "../../../ui/board/ManagerHistory";
import { Card } from "../../../ui/Card";
import { EmptyState } from "../../../ui/EmptyState";
import { FansCard } from "../../../ui/fans/FansCard";
import { RivalsList } from "../../../ui/fans/RivalsList";
import { Tabs } from "../../../ui/Tabs";

type Game = ReturnType<typeof useGame>;
type Tab = "board" | "fans" | "offers" | "history" | "coaches";
const TABS: readonly Tab[] = ["board", "fans", "offers", "history", "coaches"];

/** Diretoria (029): metas e confiança lado a lado, e as mudanças por rodada abaixo. */
function BoardTab({ save }: { save: SaveFile }) {
  const t = useT();
  const { manager } = save.board;
  const club = manager.clubId ? save.board.clubs[manager.clubId] : undefined;
  if (!club) {
    return (
      <EmptyState title={t("career.unemployed")}>
        <p>{t("career.unemployedDetail")}</p>
        <p>{t("career.reputation", { value: manager.reputation })}</p>
      </EmptyState>
    );
  }
  return (
    <div className={styles.layout}>
      <div className={styles.columns}>
        <Card aria-label={t("board.goals")}>
          <h2 className={styles.heading}>{t("board.goals")}</h2>
          <GoalsList save={save} />
          <p>{t("career.reputation", { value: manager.reputation })}</p>
          {manager.noFiring ? <p className={styles.muted}>{t("board.noFiring")}</p> : null}
        </Card>
        <Card aria-label={t("board.confidenceLabel")}>
          <h2 className={styles.heading}>{t("board.confidenceLabel")}</h2>
          <ConfidenceMeter value={club.confidence} recent={club.recent} />
        </Card>
      </div>
      <ConfidenceChanges recent={club.recent} />
    </div>
  );
}

function Career({ save, game }: { save: SaveFile; game: Game }) {
  const t = useT();
  // `?aba=offers` abre as propostas (link do aviso da Início).
  const requested = useSearchParams().get("aba");
  const levels = save.league.divisions.map((season) => season.divisionLevel);
  const [level, setLevel] = useState(userDivisionLevel(save));
  const offers = pendingOffers(save.board).length;
  const locked = game.state.live !== undefined;
  const heading = useRef<HTMLHeadingElement>(null);
  const label = (name: Tab) =>
    name === "offers" && offers > 0
      ? `${t(`career.tab.${name}`)} (${offers})`
      : t(`career.tab.${name}`);
  return (
    <div className={styles.layout}>
      <h2 ref={heading} tabIndex={-1} className="screen-title">
        {t("career.title")}
      </h2>
      {/* A dica de primeiro acesso da diretoria aponta para a barra de abas. */}
      <div data-tip-anchor="board">
        <Tabs
          label={t("career.tablist")}
          initial={TABS.find((name) => name === requested) ?? "board"}
          tabs={[
            { id: "board", label: label("board"), content: <BoardTab save={save} /> },
            {
              id: "fans",
              label: label("fans"),
              content: (
                <div className={styles.columns}>
                  <FansCard save={save} clubId={save.clubId} />
                  <Card className={styles.card}>
                    <h2>{t("fans.rivals.title")}</h2>
                    <RivalsList save={save} clubId={save.clubId} />
                  </Card>
                </div>
              ),
            },
            {
              id: "offers",
              label: label("offers"),
              content: (
                <Card>
                  <h2 className={styles.heading}>{t("career.offers.title")}</h2>
                  <JobOffers
                    save={save}
                    disabled={locked}
                    onAccept={(offerId) => {
                      game.acceptJobOffer(offerId);
                      // O botão some com a proposta: o foco vai ao título, e não se perde.
                      heading.current?.focus();
                    }}
                    onDecline={(offerId) => {
                      game.declineJobOffer(offerId);
                      heading.current?.focus();
                    }}
                  />
                </Card>
              ),
            },
            { id: "history", label: label("history"), content: <ManagerHistory save={save} /> },
            {
              id: "coaches",
              label: label("coaches"),
              content: (
                <div className={styles.layout}>
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
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

export default function CareerPage() {
  return <GameLayout>{(save, game) => <Career save={save} game={game} />}</GameLayout>;
}
