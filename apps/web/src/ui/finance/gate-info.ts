import { clubFixtures, type GateRecord } from "@brasfoot-like/engine";
import { type SaveFile, seasonStateOf } from "@brasfoot-like/save";
import { t } from "../../i18n";
import { phaseLabel } from "../cup/phase";
import { stageLabel } from "../stages/label";

export interface GateInfo {
  competition: string;
  /** Fase ou rodada daquela partida na competição ("Grupo B, rodada 3", "Oitavas", "Rodada 5"). */
  phase: string;
}

/**
 * Competição e fase/rodada de cada jogo em casa. A rodada guardada na bilheteria é a da liga
 * (0 antes da primeira), então a partida é achada no calendário do clube pela data e competição.
 */
export function gateInfoOf(save: SaveFile): (gate: GateRecord) => GateInfo {
  const nameOf = (competitionId: string) =>
    save.bank.competitions.find((entry) => entry.id === competitionId)?.name ?? "";
  const fixtures = new Map(
    clubFixtures(seasonStateOf(save), save.clubId).map((fixture) => [
      `${fixture.date}|${fixture.competitionId}`,
      fixture,
    ]),
  );
  return (gate) => {
    const fixture =
      gate.date && gate.competitionId
        ? fixtures.get(`${gate.date}|${gate.competitionId}`)
        : undefined;
    if (fixture) {
      return {
        competition: nameOf(fixture.competitionId),
        phase:
          stageLabel(save, fixture) ??
          phaseLabel(save, fixture.competitionId, fixture.round) ??
          t("home.roundLabel", { round: fixture.round }),
      };
    }
    return {
      competition: nameOf(gate.competitionId ?? save.league.competitionId),
      phase: gate.round > 0 ? t("home.roundLabel", { round: gate.round }) : "",
    };
  };
}
