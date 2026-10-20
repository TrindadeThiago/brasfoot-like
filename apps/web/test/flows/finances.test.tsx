import {
  advanceCareer,
  creditLine,
  economyRules,
  LEDGER_CATEGORIES,
  nextHomeGateEstimate,
  seasonFinanceSummary,
} from "@brasfoot-like/engine";
import { advanceCareerSeason, userSeason } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatMoney, formatNumber, t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { elapse, loadSaved, useRoundClock } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

afterEach(() => vi.useRealTimers());

/** O Testing Library normaliza espaços inquebráveis do DOM; o texto esperado também. */
const visible = (text: string) => text.replace(/\u00a0/g, " ");

describe("finanças por rodada (US1)", () => {
  it("simular direto movimenta e salva as finanças, iguais às do motor", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: t("home.simulate") }));
    await waitFor(async () => expect(userSeason(await loadSaved(store)).nextRound).toBe(2));
    const saved = await loadSaved(store);
    const expected = advanceCareer(
      save.league,
      save.finances,
      save.bank,
      { rounds: 1 },
      save.clubId,
      {
        [save.clubId]: save.lineup,
      },
      { state: save.renewal, careerSeed: save.seed },
      // O app fecha a rodada com o mercado da IA (011), que também movimenta caixas.
      { state: save.market, careerSeed: save.seed },
    );
    if (!expected.ok) throw new Error("falhou");
    expect(saved.finances).toEqual(expected.finances);
    const mine = saved.finances.ledger.filter(
      (entry) => entry.clubId === save.clubId && entry.round === 1,
    );
    expect(mine.some((entry) => entry.category === "wages")).toBe(true);
    const delta = mine.reduce((sum, entry) => sum + entry.amount, 0);
    expect(saved.finances.clubs[save.clubId]?.cash).toBe(
      (save.finances.clubs[save.clubId]?.cash ?? 0) + delta,
    );
  });

  it("a rodada ao vivo salva as mesmas finanças", async () => {
    localStorage.clear();
    useRoundClock();
    const { store, save } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole("button", { name: t("home.playLive") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/rodada"));
    await elapse(60_000);
    await waitFor(async () => expect(userSeason(await loadSaved(store)).nextRound).toBe(2));
    const expected = advanceCareer(
      save.league,
      save.finances,
      save.bank,
      { rounds: 1 },
      save.clubId,
      {
        [save.clubId]: save.lineup,
      },
      { state: save.renewal, careerSeed: save.seed },
      // O app fecha a rodada com o mercado da IA (011), que também movimenta caixas.
      { state: save.market, careerSeed: save.seed },
    );
    if (!expected.ok) throw new Error("falhou");
    expect((await loadSaved(store)).finances).toEqual(expected.finances);
  });
});

describe("preço do ingresso (US2)", () => {
  it("mostra a estimativa, salva o preço e o próximo jogo em casa usa o novo preço", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup();
    await screen.findByRole("region", { name: t("home.nextMatch") });
    await user.keyboard("6");
    expect(memoryRouter.pathname()).toBe("/jogo/financas");
    const panel = await screen.findByRole("region", { name: t("finance.ticket.title") });
    const { min, max } = economyRules(save.bank, save.league.competitionId).priceRange;
    const input = within(panel).getByLabelText(t("finance.ticket.price", { min, max }));
    await user.clear(input);
    await user.type(input, "25");
    const estimate = nextHomeGateEstimate(save.finances, save.league, save.bank, save.clubId, 25);
    if (!estimate) throw new Error("sem jogo em casa");
    expect(
      within(panel).getByText(
        visible(
          t("finance.ticket.estimate", {
            attendance: formatNumber(estimate.attendance),
            occupancy: Math.round((100 * estimate.attendance) / estimate.capacity),
            revenue: formatMoney(estimate.revenue),
          }),
        ),
      ),
    ).toBeDefined();
    await user.click(within(panel).getByRole("button", { name: t("finance.ticket.apply") }));
    await waitFor(async () =>
      expect((await loadSaved(store)).finances.clubs[save.clubId]?.ticketPrice).toBe(25),
    );

    await user.clear(input);
    await user.type(input, String(max + 1));
    await user.click(within(panel).getByRole("button", { name: t("finance.ticket.apply") }));
    expect(within(panel).getByRole("alert").textContent).toContain(String(max + 1));
    expect((await loadSaved(store)).finances.clubs[save.clubId]?.ticketPrice).toBe(25);

    await user.keyboard("1");
    for (let round = 1; round <= 4; round++) {
      await user.click(await screen.findByRole("button", { name: t("home.simulate") }));
      await waitFor(async () =>
        expect(userSeason(await loadSaved(store)).nextRound).toBe(round + 1),
      );
    }
    const gates = (await loadSaved(store)).finances.gates.filter(
      (gate) => gate.clubId === save.clubId,
    );
    expect(gates.length).toBeGreaterThan(0);
    expect(gates.every((gate) => gate.price === 25)).toBe(true);
  });
});

describe("tela de finanças (US4)", () => {
  it("totais por categoria + saldo inicial = saldo atual; jogos em casa listados", async () => {
    const { store, save } = await storedCareer(7);
    renderApp("/jogo/financas?c=tela", store);
    const summary = seasonFinanceSummary(save.finances, save.clubId);
    const region = await screen.findByRole("region", {
      name: t("finance.season", { year: save.league.year }),
    });
    for (const category of LEDGER_CATEGORIES) {
      const term = within(region).getByText(t(`finance.category.${category}`));
      expect(term.nextElementSibling?.textContent).toBe(formatMoney(summary.totals[category]));
    }
    const sum = LEDGER_CATEGORIES.reduce((total, category) => total + summary.totals[category], 0);
    expect(summary.startCash + sum).toBe(summary.cash);
    expect(region.textContent).toContain(formatMoney(summary.cash));
    const games = await screen.findByRole("table", { name: t("finance.games.title") });
    const rows = within(within(games).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole(
      "row",
    );
    const homeGames = save.finances.gates.filter((gate) => gate.clubId === save.clubId);
    expect(rows).toHaveLength(homeGames.length);
    expect(homeGames.every((gate) => gate.attendance <= gate.capacity)).toBe(true);
    expect(screen.getByText(t("finance.history.empty"))).toBeDefined();
  });

  it("depois de uma virada, o histórico mostra a temporada encerrada; saldo na Início", async () => {
    const { store, save } = await storedCareer(1, (career) => {
      const played = advanceCareer(
        career.league,
        career.finances,
        career.bank,
        { toEnd: true },
        career.clubId,
      );
      if (!played.ok) throw new Error("falhou");
      const turned = advanceCareerSeason(
        { ...career, league: played.league, finances: played.finances },
        career.savedAt,
      );
      if (!turned.ok) throw new Error("falhou");
      return turned.save;
    });
    renderApp("/jogo/financas?c=tela", store);
    const history = await screen.findByRole("table", { name: t("finance.history.title") });
    const rows = within(within(history).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole(
      "row",
    );
    expect(rows).toHaveLength(1);
    const summary = save.finances.seasons.find((item) => item.clubId === save.clubId);
    expect(rows[0]?.textContent).toContain(formatMoney(summary?.endCash ?? 0));
    memoryRouter.push("/jogo?c=tela");
    expect(
      await screen.findByText(
        visible(
          t("home.cash", { amount: formatMoney(save.finances.clubs[save.clubId]?.cash ?? 0) }),
        ),
      ),
    ).toBeDefined();
  }, 60000);
});

describe("crédito bancário (US5)", () => {
  it("toma, paga juros na rodada, amortiza e quita; acima do limite é recusado", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/financas?c=tela", store);
    const panel = await screen.findByRole("region", { name: t("finance.credit.title") });
    const user = userEvent.setup();
    const amount = within(panel).getByLabelText(t("finance.credit.amount"));
    await user.type(amount, "1000000");
    await user.click(within(panel).getByRole("button", { name: t("finance.credit.take") }));
    await waitFor(async () =>
      expect((await loadSaved(store)).finances.clubs[save.clubId]?.debt).toBe(1_000_000),
    );

    memoryRouter.push("/jogo?c=tela");
    await user.click(await screen.findByRole("button", { name: t("home.simulate") }));
    await waitFor(async () => expect(userSeason(await loadSaved(store)).nextRound).toBe(2));
    const afterRound = await loadSaved(store);
    expect(
      afterRound.finances.ledger.some(
        (entry) => entry.clubId === save.clubId && entry.category === "interest",
      ),
    ).toBe(true);

    memoryRouter.push("/jogo/financas?c=tela");
    const again = await screen.findByRole("region", { name: t("finance.credit.title") });
    await user.type(within(again).getByLabelText(t("finance.credit.amount")), "400000");
    await user.click(within(again).getByRole("button", { name: t("finance.credit.repay") }));
    await waitFor(async () =>
      expect((await loadSaved(store)).finances.clubs[save.clubId]?.debt).toBe(600_000),
    );
    await user.click(within(again).getByRole("button", { name: t("finance.credit.settle") }));
    await waitFor(async () =>
      expect((await loadSaved(store)).finances.clubs[save.clubId]?.debt).toBe(0),
    );

    const current = await loadSaved(store);
    const { available } = creditLine(current.finances, current.league, current.bank, save.clubId);
    await user.type(
      within(again).getByLabelText(t("finance.credit.amount")),
      String(available + 1),
    );
    await user.click(within(again).getByRole("button", { name: t("finance.credit.take") }));
    expect(within(again).getByRole("alert").textContent).toContain(formatNumber(available));
    expect((await loadSaved(store)).finances.clubs[save.clubId]?.debt).toBe(0);
  });
});

describe("expansão do estádio (US6)", () => {
  it("contrata, recusa a segunda e só aumenta a capacidade no fim da obra", async () => {
    const { store, save } = await storedCareer(1);
    const rules = economyRules(save.bank, save.league.competitionId);
    const cash = save.finances.clubs[save.clubId]?.cash ?? 0;
    const index = rules.stadium.options.findIndex((option) => option.cost <= cash);
    const option = rules.stadium.options[index];
    if (!option) throw new Error("nenhuma obra cabe no caixa");
    const capacity = save.finances.clubs[save.clubId]?.capacity ?? 0;
    renderApp("/jogo/financas?c=tela", store);
    const panel = await screen.findByRole("region", { name: t("finance.stadium.title") });
    const user = userEvent.setup();
    const label = t("finance.stadium.option", {
      seats: formatNumber(option.seats),
      cost: formatMoney(option.cost),
      rounds: option.rounds,
    });
    await user.click(
      within(panel).getByRole("button", {
        name: t("finance.stadium.startOption", { option: label }),
      }),
    );
    await waitFor(async () =>
      expect((await loadSaved(store)).finances.clubs[save.clubId]?.works?.seats).toBe(option.seats),
    );
    expect(
      within(panel).getByText(
        t("finance.stadium.inProgress", {
          seats: formatNumber(option.seats),
          remaining: option.rounds,
        }),
      ),
    ).toBeDefined();
    expect(within(panel).queryAllByRole("button")).toHaveLength(0);

    memoryRouter.push("/jogo?c=tela");
    for (let round = 1; round <= option.rounds; round++) {
      await user.click(await screen.findByRole("button", { name: t("home.simulate") }));
      await waitFor(async () =>
        expect(userSeason(await loadSaved(store)).nextRound).toBe(round + 1),
      );
      const club = (await loadSaved(store)).finances.clubs[save.clubId];
      expect(club?.capacity).toBe(round < option.rounds ? capacity : capacity + option.seats);
    }
  }, 60000);
});

describe("crise financeira (US8)", () => {
  it("aparece na Início, na tela de finanças e no histórico de crises", async () => {
    const { store, save } = await storedCareer(1, (career) => {
      const finances = structuredClone(career.finances);
      const club = finances.clubs[career.clubId];
      if (!club) throw new Error("sem clube");
      finances.ledger.push({
        clubId: career.clubId,
        season: 1,
        round: 0,
        category: "prize",
        amount: -club.cash - 2_000_000,
      });
      club.cash = -2_000_000;
      club.negativeRounds = 12;
      club.inCrisis = true;
      finances.crises.push({ clubId: career.clubId, startSeason: 1, startRound: 10 });
      return { ...career, finances };
    });
    renderApp("/jogo?c=tela", store);
    expect((await screen.findByRole("alert")).textContent).toBe(t("home.crisis", { rounds: 12 }));
    memoryRouter.push("/jogo/financas?c=tela");
    expect(await screen.findByText(t("finance.crisis", { rounds: 12 }))).toBeDefined();
    expect(
      screen.getByText(
        t("finance.history.crisis", {
          startYear: save.league.year,
          startRound: 10,
          end: "open",
          endYear: 0,
          endRound: 0,
        }),
      ),
    ).toBeDefined();
  });
});
