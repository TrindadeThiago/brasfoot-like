import type { LeagueSeason } from "../career/types";
import type { CompletedBank } from "../model/types";
import { fansRules } from "./rules";
import type { FansState } from "./types";

/** Torcidas de todos os clubes da competição, com humor neutro. */
export function createFans(world: CompletedBank, league: LeagueSeason): FansState {
  const { neutral } = fansRules(world, league.competitionId);
  const clubs: FansState["clubs"] = {};
  for (const clubId of league.divisions.flatMap((season) => season.clubIds).sort()) {
    clubs[clubId] = { mood: neutral, recent: [] };
  }
  return { clubs };
}
