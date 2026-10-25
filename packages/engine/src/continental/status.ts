import { tieState } from "../knockout/tie";
import type { CompletedBank } from "../model/types";
import type { Season } from "../season/types";
import { cupView } from "../stages/cup-view";
import { championOf } from "./reached";
import type { CampaignStatus } from "./types";

/**
 * Situação de cada clube numa competição em fases (022 R6, R8): jogando, eliminado ou campeão.
 * Uma passada só: perdedores dos confrontos decididos e quem não passou de uma fase de pontos já
 * encerrada para a seguinte, já começada.
 */
export function campaignStatuses(
  world: Pick<CompletedBank, "competitions">,
  season: Season,
): Map<string, CampaignStatus> {
  const statuses = new Map<string, CampaignStatus>(
    season.clubIds.map((clubId) => [clubId, "playing" as const]),
  );
  const eliminate = (clubId: string) => {
    if (statuses.get(clubId) === "playing") statuses.set(clubId, "eliminated");
  };
  const losers = (view: Season) => {
    for (const phase of view.bracket?.phases ?? []) {
      for (const tie of phase.ties) {
        const state = tieState(view, phase.index, tie.id);
        if (state.decided && state.loser) eliminate(state.loser);
      }
    }
  };
  if (season.bracket) {
    losers(season);
  } else {
    const stages = season.stages ?? [];
    for (const state of stages) {
      if (!state.started) continue;
      if (state.kind === "knockout") {
        losers(cupView(season, world, state.index));
        continue;
      }
      const next = stages[state.index + 1];
      const finished = state.rounds.length > 0 && season.nextRound > Math.max(...state.rounds);
      if (!finished || !next?.started) continue;
      const later = new Set(stages.slice(state.index + 1).flatMap((stage) => stage.clubIds));
      for (const clubId of state.clubIds) if (!later.has(clubId)) eliminate(clubId);
    }
  }
  const champion = championOf(world, season);
  if (champion) {
    for (const clubId of statuses.keys())
      statuses.set(clubId, clubId === champion ? "champion" : "eliminated");
  }
  return statuses;
}
