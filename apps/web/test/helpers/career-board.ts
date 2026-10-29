import { type BoardState, seasonGoals } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";

/** Uma proposta de emprego pendente, sem tirar o técnico do clube. */
export function withPendingOffer(save: SaveFile): SaveFile {
  const board: BoardState = structuredClone(save.board);
  const target = Object.keys(board.clubs).find((id) => id !== save.clubId) as string;
  board.offers.push({
    id: "offer-x",
    clubId: target,
    season: 1,
    round: 0,
    expiresRound: 9,
    goals: seasonGoals(
      { world: save.bank, league: save.league, finances: save.finances },
      target,
      board.manager.reputation,
    ),
    status: "pending",
  });
  return { ...save, board };
}

/** Desemprega o técnico com um estado coerente do save (como no teste de fluxo da diretoria). */
export function unemployed(save: SaveFile): SaveFile {
  const board: BoardState = structuredClone(save.board);
  const own = save.clubId;
  board.manager.clubId = null;
  board.manager.firedBy = { clubId: own, season: 1 };
  board.notice = { kind: "fired", clubId: own, season: 1, round: 0 };
  board.history.stints = [
    { clubId: own, from: { season: 1, round: 0 }, to: { season: 1, round: 0 }, exit: "fired" },
    { clubId: null, from: { season: 1, round: 0 } },
  ];
  board.vacancies.push({ id: "vacancy-a", clubId: own, season: 1, round: 0, considered: true });
  return { ...save, board };
}

/** Troca as metas do clube para incluir uma meta do estadual já decidida (ou não). */
export function withRegionalGoal(save: SaveFile, result?: "met" | "missed"): SaveFile {
  const clubId = save.board.manager.clubId as string;
  const club = save.board.clubs[clubId];
  if (!club?.goals) throw new Error("sem metas");
  return {
    ...save,
    board: {
      ...save.board,
      clubs: {
        ...save.board.clubs,
        [clubId]: {
          ...club,
          goals: {
            ...club.goals,
            regional: {
              competitionId: save.league.competitionId,
              level: 1,
              target: { stage: 0 },
              weight: 1,
              ...(result ? { result } : {}),
            },
          },
        },
      },
    },
  };
}
