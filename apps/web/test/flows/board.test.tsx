import {
  advanceCareer,
  type BoardState,
  createBoard,
  expectationOf,
  GOAL_TIERS,
  type SeasonGoals,
  seasonGoals,
} from "@brasfoot-like/engine";
import { initialLineup, type SaveFile, userSeason } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { loadSaved } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 60000 });

/** O técnico passa a treinar `clubId` (diretoria refeita, escalação do clube). */
function managing(save: SaveFile, clubId: string, noFiring = false): SaveFile {
  const board = createBoard(save.bank, save.league, save.finances, save.seed, {
    clubId,
    noFiring,
  });
  const next: SaveFile = { ...save, clubId, board };
  return { ...next, lineup: initialLineup(save.bank, userSeason(next), clubId) };
}

function byExpectation(save: SaveFile): string[] {
  const context = { world: save.bank, league: save.league };
  return [...userSeason(save).clubIds].sort(
    (a, b) => expectationOf(context, a) - expectationOf(context, b),
  );
}

/** Desemprega o técnico e abre uma proposta de outro clube (estado coerente do save). */
function unemployedWithOffer(save: SaveFile): { save: SaveFile; target: string } {
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
  const target = Object.keys(board.clubs).find((id) => id !== own) as string;
  const coach = board.coaches.find((entry) => entry.clubId === target);
  if (coach) coach.clubId = null;
  (board.clubs[target] as { coachId: string | null }).coachId = null;
  const goals: SeasonGoals = seasonGoals(
    { world: save.bank, league: save.league, finances: save.finances },
    target,
    board.manager.reputation,
  );
  board.vacancies.push({
    id: "vacancy-b",
    clubId: target,
    season: 1,
    round: 0,
    considered: true,
    offerId: "offer-x",
  });
  board.offers.push({
    id: "offer-x",
    clubId: target,
    season: 1,
    round: 0,
    expiresRound: 2,
    goals,
    status: "pending",
  });
  return { save: { ...save, board }, target };
}

describe("diretoria no app (012)", () => {
  it("clube grande recebe meta mais exigente que clube pequeno (critério de aceite 1)", async () => {
    const base = await storedCareer(1);
    const order = byExpectation(base.save);
    const big = await storedCareer(1, (save) => managing(save, order[0] as string));
    const small = await storedCareer(1, (save) => managing(save, order.at(-1) as string));
    const tierOf = (save: SaveFile) => save.board.clubs[save.clubId]?.goals?.sport.tier ?? "title";
    expect(GOAL_TIERS.indexOf(tierOf(big.save))).toBeLessThan(
      GOAL_TIERS.indexOf(tierOf(small.save)),
    );
    renderApp("/jogo?c=tela", big.store);
    const card = await screen.findByRole("region", { name: t("board.title") });
    expect(within(card).getByText(t(`board.goal.tier.${tierOf(big.save)}`))).toBeDefined();
  });

  it("depois de rodadas, a confiança e os motivos aparecem na Início e na Carreira", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(4);
    const club = save.board.clubs[save.clubId];
    if (!club) throw new Error("sem diretoria");
    expect(club.recent).toHaveLength(3);
    renderApp("/jogo?c=tela", store);
    const card = await screen.findByRole("region", { name: t("board.title") });
    expect(within(card).getByText(String(club.confidence))).toBeDefined();
    expect(within(card).getByText(t("board.reasons"))).toBeDefined();
    await user.click(within(card).getByRole("link", { name: t("nav.career") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/carreira"));
    expect(await screen.findByText(t("board.history"))).toBeDefined();
  });

  it("fim de temporada mostra a avaliação da diretoria", async () => {
    const { store, save } = await storedCareer(1, (current) => {
      const played = advanceCareer(
        current.league,
        current.finances,
        current.bank,
        { toEnd: true },
        current.clubId,
        undefined,
        undefined,
        { state: current.market, careerSeed: current.seed },
        {
          state: { ...current.board, manager: { ...current.board.manager, noFiring: true } },
          careerSeed: current.seed,
        },
      );
      if (!played.ok || !played.board) throw new Error("temporada");
      return {
        ...current,
        league: played.league,
        finances: played.finances,
        bank: played.world,
        market: played.market ?? current.market,
        board: played.board,
      };
    });
    const evaluation = save.board.evaluation;
    if (!evaluation) throw new Error("sem avaliação");
    renderApp("/jogo/fim-de-temporada?c=tela", store);
    expect(
      await screen.findByText(t("board.evaluation.title", { year: save.league.year })),
    ).toBeDefined();
    expect(screen.getByText(t(`board.evaluation.decision.${evaluation.decision}`))).toBeDefined();
    expect(evaluation.decision).not.toBe("fired");
  });

  it("desempregado: sem clube, telas do clube somem, aceitar a proposta volta ao jogo", async () => {
    const user = userEvent.setup();
    const prepared = await storedCareer(1, (save) => unemployedWithOffer(save).save);
    const target = prepared.save.board.offers[0]?.clubId as string;
    const targetName = prepared.save.bank.clubs.find((club) => club.id === target)?.name ?? "";
    const ownName =
      prepared.save.bank.clubs.find((club) => club.id === prepared.save.clubId)?.name ?? "";
    renderApp("/jogo?c=tela", prepared.store);
    expect(
      await screen.findByRole("heading", { name: t("header.unemployed", { club: ownName }) }),
    ).toBeDefined();
    const nav = screen.getByRole("navigation", { name: t("nav.menu") });
    expect(within(nav).queryByRole("link", { name: t("nav.squad") })).toBeNull();
    expect(within(nav).queryByRole("link", { name: t("nav.market") })).toBeNull();
    expect(screen.getByText(t("board.notice.fired", { club: ownName }))).toBeDefined();

    const offer = screen.getByRole("article", { name: targetName });
    await user.click(within(offer).getByRole("button", { name: t("career.offers.accept") }));
    expect(await screen.findByRole("heading", { name: targetName })).toBeDefined();
    expect(within(nav).getByRole("link", { name: t("nav.squad") })).toBeDefined();
    await waitFor(async () => {
      const saved = await loadSaved(prepared.store);
      expect(saved.clubId).toBe(target);
      expect(saved.board.manager.clubId).toBe(target);
    });
  });

  it("desempregado numa tela do clube volta para a Início; rodada roda sem escalação", async () => {
    const user = userEvent.setup();
    const prepared = await storedCareer(1, (save) => unemployedWithOffer(save).save);
    renderApp("/jogo/elenco?c=tela", prepared.store);
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
    await user.click(await screen.findByRole("button", { name: t("home.simulate") }));
    await waitFor(async () => {
      const saved = await loadSaved(prepared.store);
      expect(saved.league.divisions[0]?.nextRound).toBe(2);
    });
  });

  it("Carreira › Técnicos e Histórico", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/carreira?c=tela", store);
    await user.click(await screen.findByRole("tab", { name: t("career.tab.coaches") }));
    const someCoach = save.board.coaches.find((coach) =>
      userSeason(save).clubIds.includes(coach.clubId ?? ""),
    );
    expect(screen.getByText(someCoach?.name ?? "")).toBeDefined();
    expect(screen.getByText(t("career.coaches.you", { name: save.managerName }))).toBeDefined();
    await user.click(screen.getByRole("tab", { name: t("career.tab.history") }));
    expect(screen.getByRole("table", { name: t("career.history.stints") })).toBeDefined();
  });
});
