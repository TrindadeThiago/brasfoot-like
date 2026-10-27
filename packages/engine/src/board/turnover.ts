import type { TurnoverStep } from "../career/types";
import { coachReputation, hireCoach } from "./coaches";
import { withContinentalGoals } from "./continental";
import { seasonGoals } from "./goals";
import { expireOffers, guaranteeOffer, pruneOffers } from "./offers";
import { withRegionalGoals } from "./regional";
import { boardRules } from "./rules";
import type { BoardState } from "./types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Etapa "board-new-season" (research.md R2), depois de "reset-market": propostas pendentes
 * expiram, vagas são preenchidas pela IA, todos os clubes recebem as metas da nova temporada e a
 * confiança parte da avaliação; o desempregado sem proposta recebe uma (FR-030).
 */
export const boardNewSeasonStep: TurnoverStep = {
  id: "board-new-season",
  run: (context) => {
    if (!context.board || !context.league || !context.finances) return context;
    const league = context.league;
    const rules = boardRules(context.world, league.competitionId);
    const board: BoardState = clone(context.board);
    const scope = {
      world: context.world,
      league,
      finances: context.finances,
      careerSeed: context.careerSeed,
    };
    const rng = context.rng("board-new-season");
    expireOffers(board, league.number, 0);
    for (const vacancy of [...board.vacancies].sort((a, b) =>
      a.clubId < b.clubId ? -1 : a.clubId > b.clubId ? 1 : 0,
    )) {
      hireCoach(board, scope, vacancy.clubId, rng.fork(vacancy.clubId));
    }
    const start = { season: league.number, round: 0 };
    for (const clubId of Object.keys(board.clubs).sort()) {
      const club = board.clubs[clubId];
      if (!club) continue;
      const fresh = club.hired.season === league.number;
      club.confidence = fresh ? rules.neutral : Math.floor((rules.neutral + club.confidence) / 2);
      club.goals = seasonGoals(scope, clubId, coachReputation(board, context.world, clubId));
      club.recent =
        clubId === board.manager.clubId
          ? [
              {
                ...start,
                delta: 0,
                value: club.confidence,
                factors: [{ kind: "seasonStart", amount: 0 }],
              },
            ]
          : [];
    }
    delete board.evaluation;
    guaranteeOffer(board, scope);
    pruneOffers(board, league.number);
    // Competição entre países (022): a meta continental da temporada, ao lado da meta de liga.
    const seasons = [league, ...(context.competitions ?? [])];
    const withGoals = withRegionalGoals(
      withContinentalGoals(board, context.world, seasons),
      context.world,
      seasons,
    );
    return { ...context, board: withGoals };
  },
};
