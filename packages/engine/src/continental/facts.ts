import type { DayMatch } from "../career/season-state";
import type { CompletedBank } from "../model/types";
import type { Season } from "../season/types";
import { seasonStages } from "../stages/rules";
import { finalOf, reachedByClub } from "./reached";
import { campaignStatuses } from "./status";

/**
 * Fatos de um dia numa competição entre países (022 R8): título, avanço de fase, eliminação numa
 * fase de pontos e goleada. Fonte das manchetes e da reação da torcida. Pura.
 */

export interface ContinentalFacts {
  titles: { competitionId: string; championId: string; runnerUpId: string }[];
  /** `phase` é o nome da 1ª fase do mata-mata em que o clube entrou (ou da etapa de pontos). */
  advances: { competitionId: string; clubId: string; stage: number; phase: string }[];
  eliminations: { competitionId: string; clubId: string; stage: number }[];
  routs: {
    competitionId: string;
    winnerId: string;
    loserId: string;
    margin: number;
    score: string;
  }[];
}

export const NO_FACTS: ContinentalFacts = { titles: [], advances: [], eliminations: [], routs: [] };

function stageName(world: CompletedBank, season: Season, stage: number): string {
  const format = seasonStages(world, season)[stage - 1];
  if (format?.type === "knockout") return format.phases[0]?.name ?? "";
  return "";
}

export function continentalFacts(
  world: CompletedBank,
  before: Season,
  after: Season,
  matches: readonly DayMatch[],
  routMargin: number,
): ContinentalFacts {
  const competitionId = after.competitionId;
  const facts: ContinentalFacts = { titles: [], advances: [], eliminations: [], routs: [] };

  const decided = finalOf(world, after);
  if (decided && !finalOf(world, before)) {
    facts.titles.push({ competitionId, ...decided });
  }

  const reachedBefore = before.records.length === 0 ? new Map() : reachedByClub(world, before);
  const reachedAfter = reachedByClub(world, after);
  for (const [clubId, reached] of [...reachedAfter].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const earlier = reachedBefore.get(clubId);
    // Só conta como avanço quem já estava numa fase e passou para a seguinte.
    if (earlier && reached.stage > earlier.stage) {
      facts.advances.push({
        competitionId,
        clubId,
        stage: reached.stage,
        phase: stageName(world, after, reached.stage),
      });
    }
  }

  const statusesBefore = campaignStatuses(world, before);
  const statusesAfter = campaignStatuses(world, after);
  const stages = after.stages ?? [];
  for (const [clubId, status] of [...statusesAfter].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (status !== "eliminated" || statusesBefore.get(clubId) === "eliminated") continue;
    const last = [...stages].reverse().find((stage) => stage.clubIds.includes(clubId));
    // Eliminação no mata-mata já vira manchete de copa (018); aqui só a fase de pontos.
    if (last && last.kind !== "knockout") {
      facts.eliminations.push({ competitionId, clubId, stage: last.index + 1 });
    }
  }

  for (const match of matches) {
    const { home, away } = match.record.score;
    const margin = Math.abs(home - away);
    if (margin < routMargin) continue;
    const homeWon = home > away;
    facts.routs.push({
      competitionId,
      winnerId: homeWon ? match.fixture.home : match.fixture.away,
      loserId: homeWon ? match.fixture.away : match.fixture.home,
      margin,
      score: `${Math.max(home, away)}-${Math.min(home, away)}`,
    });
  }
  return facts;
}
