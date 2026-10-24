import { type ClubFixture, seasonStages } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { t } from "../../i18n";

/**
 * Fase de um jogo numa divisão em fases (019 FR-030): "Grupo B, rodada 3", a rodada de uma fase de
 * pontos corridos ou o nome da fase eliminatória (com a perna, em ida e volta). Sem fase: undefined.
 */
export function stageLabel(
  save: SaveFile,
  fixture: Pick<ClubFixture, "stage" | "stageRound" | "tie" | "competitionId" | "divisionLevel">,
): string | undefined {
  const { stage } = fixture;
  if (!stage) return undefined;
  if (stage.kind === "groups") {
    return t("stages.label.group", { group: stage.group ?? "", round: fixture.stageRound ?? 1 });
  }
  if (stage.kind === "league") {
    return t("stages.label.league", { round: fixture.stageRound ?? 1 });
  }
  const format = seasonStages(save.bank, {
    competitionId: fixture.competitionId,
    divisionLevel: fixture.divisionLevel,
  })[stage.index];
  if (format?.type !== "knockout" || !fixture.tie) return undefined;
  const phase = format.phases[fixture.tie.phase];
  if (!phase) return undefined;
  return phase.legs === 2
    ? t("cup.phaseLeg", { phase: phase.name, leg: t(`cup.leg.${fixture.tie.leg}`) })
    : phase.name;
}
