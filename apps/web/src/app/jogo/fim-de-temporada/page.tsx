"use client";

import { competitionEntry, cupEntry, cupSeasonOf } from "@brasfoot-like/engine";
import {
  divisionNameOf,
  isCareerSeasonOver,
  qualificationPreview,
  type SaveFile,
} from "@brasfoot-like/save";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import type { useGame } from "../../../game/GameProvider";
import { seasonEndSummary } from "../../../game/selectors";
import { divisionHref } from "../../../game/useDivision";
import { useT } from "../../../i18n";
import { Button } from "../../../ui/Button";
import { CupResult } from "../../../ui/cup/CupHistory";
import { OtherCompetitions } from "../../../ui/history/OtherCompetitions";
import { QualificationSummary } from "../../../ui/qualification/QualificationSummary";
import { Campaign } from "../../../ui/season/Campaign";
import { Champions } from "../../../ui/season/Champions";
import { ClubResult } from "../../../ui/season/ClubResult";
import { FinalTable } from "../../../ui/season/FinalTable";
import { Moves } from "../../../ui/season/Moves";
import { SeasonHeader } from "../../../ui/season/SeasonHeader";
import footer from "../../../ui/season/season.module.css";
import { screenHref } from "../../../ui/shell/screens";
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
  const staged = save.league.divisions.filter((season) => season.stages);
  const others = save.competitions
    .filter((league) => !cupSeasonOf(league))
    .map((league) => competitionEntry(league, save.bank));
  const cups = save.competitions.flatMap((league) => cupEntry(league) ?? []);
  return (
    <div className={styles.layout}>
      <SeasonHeader year={summary.year} state={state} onNext={() => void next()} />
      <ClubResult save={save} summary={summary} />
      <Campaign save={save} summary={summary} />
      <Champions save={save} summary={summary} />
      <Moves save={save} summary={summary} />
      <details>
        <summary>{t("seasonEnd.otherCompetitions")}</summary>
        {staged.map((season) => (
          <FinalPositions key={season.divisionLevel} save={save} season={season} />
        ))}
        <OtherCompetitions save={save} entries={others} />
        <QualificationSummary save={save} record={qualificationPreview(save)} />
        <CupResult save={save} entries={cups} />
      </details>
      <FinalTable save={save} />
      <div className={footer.footer}>
        <nav className={footer.footer}>
          {save.league.divisions.map((season) => (
            <Link
              key={season.divisionLevel}
              href={divisionHref("/jogo/competicao", save.id, season.divisionLevel)}
            >
              {t("seasonEnd.finalStandings", {
                division: divisionNameOf(save, season.divisionLevel),
              })}
            </Link>
          ))}
          <Link href={screenHref("/jogo/historico", save.id)}>{t("seasonEnd.history")}</Link>
        </nav>
        <Button variant="primary" onClick={() => void next()} disabled={state === "busy"}>
          {state === "busy" ? t("seasonEnd.preparing") : t("seasonEnd.next")}
        </Button>
      </div>
    </div>
  );
}

export default function SeasonEndPage() {
  return <GameLayout>{(save, game) => <SeasonEnd save={save} game={game} />}</GameLayout>;
}
