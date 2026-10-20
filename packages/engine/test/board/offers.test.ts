import { describe, expect, it } from "vitest";
import {
  acceptJobOffer,
  compatibleClub,
  createOffer,
  declineJobOffer,
  guaranteeOffer,
  pendingOffers,
} from "../../src/board/offers";
import { fireManager } from "../../src/board/round";
import { DEFAULT_BOARD } from "../../src/board/rules";
import { boardNewSeasonStep } from "../../src/board/turnover";
import type { BoardState } from "../../src/board/types";
import { seasonTurnover } from "../../src/career/turnover";
import { createRng } from "../../src/rng/xoshiro";
import { type Career, MANAGER, newCareer, play, SEED } from "./helpers";

const rules = DEFAULT_BOARD;

function reputationOf(career: Career, clubId: string): number {
  return career.world.clubs.find((club) => club.id === clubId)?.reputation ?? 0;
}

/** Carreira com o jogador demitido na rodada `round` e uma vaga aberta no clube `clubId`. */
function unemployedWithVacancy(round = 10) {
  const career = play(newCareer(), { rounds: round });
  const board: BoardState = structuredClone(career.board);
  fireManager(board, { season: 1, round }, board.manager.reputation);
  const target = Object.keys(board.clubs)
    .filter((id) => id !== MANAGER)
    .find((id) =>
      compatibleClub(rules, board.manager.reputation, reputationOf(career, id)),
    ) as string;
  const coachId = board.clubs[target]?.coachId as string;
  const coach = board.coaches.find((entry) => entry.id === coachId);
  if (coach) coach.clubId = null;
  (board.clubs[target] as { coachId: string | null }).coachId = null;
  const vacancy = { id: "vacancy-x", clubId: target, season: 1, round, considered: true };
  board.vacancies.push(vacancy);
  const offer = createOffer(board, career, vacancy);
  return { career: { ...career, board }, target, offer };
}

describe("compatibilidade (R10)", () => {
  it("janela de reputação; empregado só sobe", () => {
    expect(compatibleClub(rules, 30, 30)).toBe(true);
    expect(compatibleClub(rules, 30, 30 + rules.upperMargin + 1)).toBe(false);
    expect(compatibleClub(rules, 50, 50 - rules.lowerMargin - 1)).toBe(false);
    expect(compatibleClub(rules, 30, 35, 40)).toBe(false);
    expect(compatibleClub(rules, 30, 35, 20)).toBe(true);
  });
});

describe("demissão, propostas e recomeço (US4, FR-022 a FR-030)", () => {
  it("demitido: sem clube, passagem fechada, vaga aberta, aviso", () => {
    const career = play(newCareer(), { rounds: 10 });
    const board: BoardState = structuredClone(career.board);
    fireManager(board, { season: 1, round: 10 }, 25);
    expect(board.manager.clubId).toBeNull();
    expect(board.manager.firedBy).toEqual({ clubId: MANAGER, season: 1 });
    expect(board.history.stints.at(-2)).toMatchObject({ clubId: MANAGER, exit: "fired" });
    expect(board.history.stints.at(-1)).toMatchObject({ clubId: null });
    expect(board.vacancies.some((vacancy) => vacancy.clubId === MANAGER)).toBe(true);
    expect(board.notice).toMatchObject({ kind: "fired", clubId: MANAGER });
  });

  it("aceitar: assume o clube, descarta as outras, metas de meio de temporada", () => {
    const { career, target, offer } = unemployedWithVacancy();
    const result = acceptJobOffer(career, offer.id, createRng("a"));
    if (!result.ok) throw new Error(result.error.code);
    expect(result.board.manager.clubId).toBe(target);
    expect(result.board.clubs[target]?.coachId).toBeNull();
    expect(result.board.clubs[target]?.confidence).toBe(rules.neutral);
    expect(result.board.clubs[target]?.goals?.sport.midSeason).toBe(true);
    expect(result.board.vacancies.some((vacancy) => vacancy.clubId === target)).toBe(false);
    expect(result.board.history.stints.at(-1)).toMatchObject({ clubId: target });
    expect(result.board.notice).toMatchObject({ kind: "hired", clubId: target });
    expect(pendingOffers(result.board)).toEqual([]);
    expect(result.previousClubId).toBeUndefined();
  });

  it("depois de aceitar, a próxima rodada já é com o novo clube", () => {
    const { career, target, offer } = unemployedWithVacancy();
    const result = acceptJobOffer(career, offer.id, createRng("a"));
    if (!result.ok) throw new Error(result.error.code);
    const next = play({ ...career, board: result.board, market: result.market }, { rounds: 1 });
    expect(next.board.manager.clubId).toBe(target);
    expect(next.board.clubs[target]?.recent.length).toBe(2);
  });

  it("recusar: vaga volta para a IA; proposta inexistente/vencida dá erro", () => {
    const { career, target, offer } = unemployedWithVacancy();
    const declined = declineJobOffer(career.board, offer.id);
    expect(declined.offers.find((entry) => entry.id === offer.id)?.status).toBe("declined");
    expect(declined.vacancies.find((v) => v.clubId === target)?.offerId).toBeUndefined();
    expect(acceptJobOffer({ ...career, board: declined }, offer.id, createRng("a")).ok).toBe(false);
    expect(acceptJobOffer(career, "offer-nada", createRng("a")).ok).toBe(false);
  });

  it("proposta vence e a vaga é preenchida pela IA", () => {
    const { career, target, offer } = unemployedWithVacancy();
    const later = play(career, { rounds: rules.offerRounds + 1 });
    expect(later.board.offers.find((entry) => entry.id === offer.id)?.status).toBe("expired");
    expect(later.board.clubs[target]?.coachId).not.toBeNull();
  });

  it("nunca do clube que o demitiu na mesma temporada", () => {
    const career = play(newCareer(), { rounds: 10 });
    const board: BoardState = structuredClone(career.board);
    fireManager(board, { season: 1, round: 10 }, 30);
    const later = play({ ...career, board }, { rounds: 5 });
    expect(later.board.offers.some((offer) => offer.clubId === MANAGER)).toBe(false);
  });

  it("garantia na virada: desempregado sem proposta recebe uma (SC-006)", () => {
    const career = play(newCareer(), { rounds: 10 });
    const board: BoardState = structuredClone(career.board);
    fireManager(board, { season: 1, round: 10 }, 30);
    guaranteeOffer(board, career);
    expect(pendingOffers(board)).toHaveLength(1);
    const chosen = pendingOffers(board)[0]?.clubId as string;
    expect(chosen).not.toBe(MANAGER);
    expect(board.clubs[chosen]?.coachId).toBeNull();
  });

  it("virada completa com o técnico desempregado termina com proposta pendente", () => {
    let career = play(newCareer(), { rounds: 10 });
    const board: BoardState = structuredClone(career.board);
    fireManager(board, { season: 1, round: 10 }, 30);
    career = play({ ...career, board }, { toEnd: true });
    const turned = seasonTurnover(career.league, career.world, [], {
      careerSeed: SEED,
      finances: career.finances,
      managerClubId: "",
      market: career.market,
      board: career.board,
    });
    if (!turned.ok || !turned.board) throw new Error(JSON.stringify(turned));
    expect(pendingOffers(turned.board).length).toBeGreaterThan(0);
    expect(turned.board.evaluation).toBeUndefined();
    expect(boardNewSeasonStep.id).toBe("board-new-season");
  });
});

describe("propostas com o técnico empregado (US6)", () => {
  it("aceitar troca de clube: o antigo ganha técnico da IA e o mercado é liberado", () => {
    const career = play(newCareer({ reputation: 60 }), { rounds: 10 });
    const board: BoardState = structuredClone(career.board);
    const current = reputationOf(career, MANAGER);
    const target = Object.keys(board.clubs).find(
      (id) => id !== MANAGER && compatibleClub(rules, 60, reputationOf(career, id), current),
    );
    if (!target) return;
    const coachId = board.clubs[target]?.coachId as string;
    const coach = board.coaches.find((entry) => entry.id === coachId);
    if (coach) coach.clubId = null;
    (board.clubs[target] as { coachId: string | null }).coachId = null;
    const vacancy = { id: "vacancy-y", clubId: target, season: 1, round: 10, considered: true };
    board.vacancies.push(vacancy);
    const offer = createOffer(board, career, vacancy);
    const before = board.clubs[MANAGER]?.confidence;
    const declined = declineJobOffer(board, offer.id);
    expect(declined.clubs[MANAGER]?.confidence).toBe(before);
    const result = acceptJobOffer({ ...career, board }, offer.id, createRng("b"));
    if (!result.ok) throw new Error(result.error.code);
    expect(result.previousClubId).toBe(MANAGER);
    expect(result.board.clubs[MANAGER]?.coachId).not.toBeNull();
    expect(result.board.history.stints.at(-2)).toMatchObject({
      clubId: MANAGER,
      exit: "offerAccepted",
    });
    expect(result.board.history.seasons.at(-1)?.clubId).toBe(MANAGER);
  });

  it("empregado nunca recebe proposta do próprio clube nem de clube menor", () => {
    let career = play(newCareer({ reputation: 60 }), { rounds: 15 });
    career = play(career, { rounds: 15 });
    const current = reputationOf(career, MANAGER);
    for (const offer of career.board.offers) {
      expect(offer.clubId).not.toBe(MANAGER);
      expect(reputationOf(career, offer.clubId)).toBeGreaterThan(current);
    }
  });
});
