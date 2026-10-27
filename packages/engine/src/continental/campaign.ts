import { dateOfRound } from "../calendar/season-calendar";
import type { CareerSeasonState } from "../career/season-state";
import type { CompletedBank } from "../model/types";
import type { Fixture, Season } from "../season/types";
import { seasonStages } from "../stages/rules";
import { compareReached, reachedByClub } from "./reached";
import { campaignStatuses } from "./status";
import type {
  CampaignAward,
  CampaignMatch,
  CampaignSpot,
  CampaignStatus,
  ClubCampaign,
  Reached,
} from "./types";

/**
 * Campanha de um clube numa competição entre países (022 R10): os jogos, onde está, o próximo
 * compromisso, os prêmios do extrato e as fases que ainda pode alcançar. Só leitura.
 */

type CampaignState = Pick<
  CareerSeasonState,
  "world" | "calendar" | "finances" | "league" | "competitions"
>;

/** Onde cai a rodada `round` da competição: a fase da sequência e, no mata-mata, fase e perna. */
function spotOf(season: Season, round: number): CampaignSpot {
  const stages = season.stages ?? [];
  const state = stages.find((entry) => entry.rounds.includes(round));
  if (!state) {
    if (season.bracket) {
      const phase = season.bracket.phases.find((entry) => entry.rounds.includes(round));
      return {
        stage: 1,
        kind: "knockout",
        phase: (phase?.index ?? 0) + 1,
        leg: (phase?.rounds.indexOf(round) ?? 0) + 1,
      };
    }
    return { stage: 1, kind: "league", stageRound: round };
  }
  if (state.kind === "knockout") {
    const phase = state.bracket?.phases.find((entry) => entry.rounds.includes(round));
    return {
      stage: state.index + 1,
      kind: "knockout",
      phase: (phase?.index ?? 0) + 1,
      leg: (phase?.rounds.indexOf(round) ?? 0) + 1,
    };
  }
  return {
    stage: state.index + 1,
    kind: state.kind,
    stageRound: state.rounds.indexOf(round) + 1,
  };
}

/** Todas as fases que um clube pode alcançar, em ordem, do começo ao título. */
function ladder(world: CompletedBank, season: Season): Reached[] {
  const rungs: Reached[] = [];
  const stages = seasonStages(world, season);
  stages.forEach((format, index) => {
    rungs.push({ stage: index + 1 });
    if (format.type !== "knockout") return;
    for (let phase = 1; phase <= format.phases.length; phase++) {
      rungs.push({ stage: index + 1, phase });
    }
    if (index === stages.length - 1) {
      rungs.push({ stage: index + 1, phase: format.phases.length + 1 });
    }
  });
  return rungs;
}

export function competitionCampaign(
  state: CampaignState,
  competitionId: string,
  clubId: string,
): ClubCampaign | undefined {
  const leagues = [state.league, ...state.competitions];
  const league = leagues.find((entry) => entry.competitionId === competitionId);
  // Competição de várias divisões (estadual, 023): a divisão do clube; senão, a única.
  const season =
    league?.divisions.find((entry) => entry.clubIds.includes(clubId)) ?? league?.divisions[0];
  if (!league || !season) return undefined;
  const reached = reachedByClub(state.world, season).get(clubId);
  if (!reached && !season.clubIds.includes(clubId)) return undefined;
  const level = reached ?? { stage: 1 };

  let status: CampaignStatus = campaignStatuses(state.world, season).get(clubId) ?? "playing";
  if (
    status === "eliminated" &&
    leagues.some((entry) => {
      const origin = entry.origins?.[clubId];
      return (
        entry.competitionId !== competitionId &&
        origin?.kind === "dropIn" &&
        origin.from === competitionId
      );
    })
  ) {
    status = "moved";
  }

  const matches: CampaignMatch[] = season.records
    .filter((record) => record.home === clubId || record.away === clubId)
    .sort((a, b) => a.round - b.round)
    .map((record) => ({
      ...spotOf(season, record.round),
      date: dateOfRound(state.calendar, competitionId, record.round) ?? "",
      round: record.round,
      home: record.home,
      away: record.away,
      score: { home: record.score.home, away: record.score.away },
    }));

  let next: ClubCampaign["next"];
  for (let round = season.nextRound; round <= season.calendar.length && !next; round++) {
    const fixture: Fixture | undefined = season.calendar[round - 1]?.fixtures.find(
      (entry) => entry.home === clubId || entry.away === clubId,
    );
    if (!fixture) continue;
    next = {
      ...spotOf(season, round),
      date: dateOfRound(state.calendar, competitionId, round) ?? "",
      opponentId: fixture.home === clubId ? fixture.away : fixture.home,
      home: fixture.home === clubId,
    };
  }

  const awards: CampaignAward[] = state.finances.ledger
    .filter(
      (entry) =>
        entry.clubId === clubId &&
        entry.category === "prize" &&
        entry.competitionId === competitionId &&
        entry.season === league.number,
    )
    .map((entry) => ({ amount: entry.amount, date: entry.date ?? "" }));

  const remaining =
    status === "playing"
      ? ladder(state.world, season).filter((rung) => compareReached(rung, level) > 0)
      : [];
  return { competitionId, clubId, reached: level, status, matches, next, awards, remaining };
}

/** Nome da 022: a campanha de um clube numa competição entre países. */
export const clubCampaign = competitionCampaign;
