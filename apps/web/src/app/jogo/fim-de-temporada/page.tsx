"use client";

import { competitionEntry, cupEntry, cupSeasonOf } from "@brasfoot-like/engine";
import { isCareerSeasonOver, qualificationPreview, type SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import type { useGame } from "../../../game/GameProvider";
import { seasonEndSummary } from "../../../game/selectors";
import { useT } from "../../../i18n";
import { screenHref } from "../../../ui/AppHeader";
import { Button } from "../../../ui/Button";
import { Evaluation } from "../../../ui/board/Evaluation";
import { CupResult } from "../../../ui/cup/CupHistory";
import { OtherCompetitions } from "../../../ui/history/OtherCompetitions";
import { QualificationSummary } from "../../../ui/qualification/QualificationSummary";
import { SeasonSummary } from "../../../ui/SeasonSummary";
import { FinalPositions } from "../../../ui/stages/FinalPositions";
import { useShortcuts } from "../../../ui/useShortcuts";
import styles from "./page.module.css";

type Game = ReturnType<typeof useGame>;

function SeasonEnd({ save, game }: { save: SaveFile; game: Game }) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  const over = isCareerSeasonOver(save);
  const next = async () => {
    if (!over || state === "busy") return;
    setState("busy");
    const outcome = await game.advanceToNextSeason();
    if (outcome === "done") router.push(screenHref("/jogo", save.id));
    else setState("failed");
  };
  useShortcuts({ "next-season": () => void next() });
  if (!over) {
    return (
      <p className={styles.note}>
        <Link href={screenHref("/jogo", save.id)}>{t("round.toHome")}</Link>
      </p>
    );
  }
  const summary = seasonEndSummary(save);
  return (
    <div className={styles.layout}>
      <h2 className="screen-title">{t("seasonEnd.title", { year: summary.year })}</h2>
      <Evaluation save={save} />
      <SeasonSummary save={save} summary={summary} />
      {save.league.divisions
        .filter((season) => season.stages)
        .map((season) => (
          <FinalPositions key={season.divisionLevel} save={save} season={season} />
        ))}
      <OtherCompetitions
        save={save}
        entries={save.competitions
          .filter((league) => !cupSeasonOf(league))
          .map((league) => competitionEntry(league, save.bank))}
      />
      <QualificationSummary save={save} record={qualificationPreview(save)} />
      <CupResult
        save={save}
        entries={save.competitions.flatMap((league) => cupEntry(league) ?? [])}
      />
      <div className={styles.actions}>
        <Button variant="primary" onClick={() => void next()} disabled={state === "busy"}>
          {state === "busy" ? t("seasonEnd.preparing") : t("seasonEnd.next")}
        </Button>
        {state === "failed" ? <p role="alert">{t("seasonEnd.failed")}</p> : null}
      </div>
    </div>
  );
}

export default function SeasonEndPage() {
  return <GameLayout>{(save, game) => <SeasonEnd save={save} game={game} />}</GameLayout>;
}
