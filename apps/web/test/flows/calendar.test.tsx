import { clubFixtures, completeCareerDay } from "@brasfoot-like/engine";
import {
  advanceCareerSeason,
  isCareerSeasonOver,
  nextFixture,
  seasonStateOf,
  withDayResult,
} from "@brasfoot-like/save";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { monthGrid, seasonLines } from "../helpers/calendar";
import { storedCareer } from "../helpers/career";
import { loadSaved } from "../helpers/live";
import { memoryRouter } from "../helpers/router";
import { TOURNAMENT_ID, TOURNAMENT_NAME, twoCompetitionsSave } from "../helpers/saves";

async function simulate(user: ReturnType<typeof userEvent.setup>) {
  const button = await screen.findByRole("button", { name: t("home.simulate") });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  await user.click(button);
}

describe("próximo compromisso de qualquer competição (017 US2)", () => {
  beforeEach(() => {
    localStorage.clear();
    memoryRouter.url = "/jogo?c=tela";
  });

  it("banco padrão: a Início mostra o próximo jogo com dia da semana e data", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    const card = await screen.findByRole("region", { name: t("home.nextMatch") });
    expect(card.textContent).toContain("domingo, 3 de janeiro de 2027");
    expect(card.textContent).toContain(t("home.roundLabel", { round: 1 }));
  });

  it("duas competições: avançar alterna domingo, domingo e quarta do torneio", async () => {
    const { store } = await storedCareer(1, () => twoCompetitionsSave("tela"));
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup({ delay: null });
    const card = () => screen.findByRole("region", { name: t("home.nextMatch") });
    expect((await card()).textContent).toContain("domingo, 3 de janeiro de 2027");
    await simulate(user);
    await waitFor(async () => {
      expect((await card()).textContent).toContain("domingo, 10 de janeiro de 2027");
    });
    await simulate(user);
    await waitFor(async () => {
      const text = (await card()).textContent ?? "";
      expect(text).toContain("quarta-feira, 13 de janeiro de 2027");
      expect(text).toContain(TOURNAMENT_NAME);
    });
    const saved = await loadSaved(store);
    expect(saved.competitions.map((season) => season.competitionId)).toEqual([TOURNAMENT_ID]);
    expect(nextFixture(saved)?.competitionId).toBe(TOURNAMENT_ID);
  });

  it("os dias sem jogo do clube são simulados e entram nas tabelas", async () => {
    // O 16º clube da Série A não joga o torneio.
    const { store } = await storedCareer(1, () => twoCompetitionsSave("tela", 15));
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await simulate(user);
    await waitFor(async () => {
      const saved = await loadSaved(store);
      expect(saved.league.divisions[0]?.nextRound).toBe(2);
    });
    await simulate(user);
    await waitFor(async () => {
      const saved = await loadSaved(store);
      // Domingo, domingo e a quarta do torneio, em que o clube não joga, foi simulada sozinha.
      expect(saved.league.divisions[0]?.nextRound).toBe(3);
      expect(saved.competitions[0]?.divisions[0]?.nextRound).toBe(1);
    });
    await simulate(user);
    await waitFor(async () => {
      const saved = await loadSaved(store);
      expect(saved.league.divisions[0]?.nextRound).toBe(4);
      expect(saved.competitions[0]?.divisions[0]?.nextRound).toBe(2);
      expect(
        clubFixtures(seasonStateOf(saved), saved.clubId).every(
          (fixture) => fixture.competitionId !== TOURNAMENT_ID,
        ),
      ).toBe(true);
    });
  });
});

describe("condição física na escalação (017 US3)", () => {
  beforeEach(() => {
    localStorage.clear();
    memoryRouter.url = "/jogo/escalacao?c=tela";
  });

  it("depois de domingo e domingo, os titulares chegam cansados à quarta, com aviso", async () => {
    const { store } = await storedCareer(1, () => twoCompetitionsSave("tela"));
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await simulate(user);
    await waitFor(async () =>
      expect((await loadSaved(store)).league.divisions[0]?.nextRound).toBe(2),
    );
    await simulate(user);
    await waitFor(async () =>
      expect((await loadSaved(store)).league.divisions[0]?.nextRound).toBe(3),
    );

    cleanup();
    renderApp("/jogo/escalacao?c=tela", store);
    const pitch = await screen.findByRole("region", { name: t("lineup.pitch") });
    const starters = within(pitch).getAllByRole("meter", { name: t("fitness.label") });
    expect(starters).toHaveLength(11);
    const levels = starters.map((meter) => Number(meter.getAttribute("aria-valuenow")));
    expect(Math.min(...levels)).toBeLessThan(100);
    const tired = levels.filter((value) => value < 75).length;
    if (tired > 0) expect(screen.getByText(t("fitness.tired", { count: tired }))).toBeDefined();
    else expect(screen.queryByText(/cansad/)).toBeNull();
  });

  it("banco padrão: todos chegam a cada jogo com a condição cheia", async () => {
    const { store } = await storedCareer(4);
    renderApp("/jogo/escalacao?c=tela", store);
    const meters = await screen.findAllByRole("meter", { name: t("fitness.label") });
    expect(meters.every((meter) => meter.getAttribute("aria-valuenow") === "100")).toBe(true);
    expect(screen.queryByText(t("fitness.tired", { count: 1 }))).toBeNull();
  });
});

describe("calendário do clube (017 US4)", () => {
  beforeEach(() => {
    localStorage.clear();
    memoryRouter.url = "/jogo/calendario?c=tela";
  });

  it("lista os jogos das duas competições por data, com placar nos disputados", async () => {
    const { store } = await storedCareer(1, () => twoCompetitionsSave("tela"));
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await simulate(user);
    await waitFor(async () =>
      expect((await loadSaved(store)).league.divisions[0]?.nextRound).toBe(2),
    );
    await simulate(user);
    await waitFor(async () =>
      expect((await loadSaved(store)).league.divisions[0]?.nextRound).toBe(3),
    );
    await simulate(user);
    await waitFor(async () =>
      expect((await loadSaved(store)).competitions[0]?.divisions[0]?.nextRound).toBe(2),
    );
    cleanup();
    renderApp("/jogo/calendario?c=tela", store);
    await monthGrid();
    const lines = (await seasonLines(userEvent.setup({ delay: null }))).map((line) => line.text);
    expect(lines).toHaveLength(38 + 18);
    expect(lines.filter((line) => line.includes(TOURNAMENT_NAME))).toHaveLength(18);
    // Os três primeiros jogos já foram disputados e mostram o placar; o seguinte, não.
    for (const line of lines.slice(0, 3)) expect(line).not.toContain(t("calendar.notPlayed"));
    expect(lines[3]).toContain(t("calendar.notPlayed"));
    // Em ordem de data: domingo, domingo, quarta.
    expect(lines[0]).toContain("3 de janeiro de 2027");
    expect(lines[2]).toContain("13 de janeiro de 2027");
  });

  it("o filtro mostra só a competição escolhida e permite voltar a todas", async () => {
    const { store } = await storedCareer(1, () => twoCompetitionsSave("tela"));
    renderApp("/jogo/calendario?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await monthGrid();
    expect(await seasonLines(user)).toHaveLength(56);
    const select = screen.getByLabelText(t("calendar.filter"));
    await user.selectOptions(select, TOURNAMENT_ID);
    expect(await seasonLines(user)).toHaveLength(18);
    await user.selectOptions(select, "all");
    expect(await seasonLines(user)).toHaveLength(56);
  }, 60_000);

  it("banco padrão: só os jogos da divisão, sem filtro nem coluna de competição", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/calendario?c=tela", store);
    await monthGrid();
    expect(await seasonLines(userEvent.setup({ delay: null }))).toHaveLength(38);
    expect(screen.queryByLabelText(t("calendar.filter"))).toBeNull();
  });
});

describe("abas por competição (017 US5)", () => {
  beforeEach(() => {
    localStorage.clear();
    memoryRouter.url = "/jogo/competicao?c=tela";
  });

  it("duas competições: abas, a do próximo jogo selecionada, e o conteúdo muda ao trocar", async () => {
    const { store } = await storedCareer(1, () => twoCompetitionsSave("tela"));
    renderApp("/jogo/competicao?c=tela", store);
    const user = userEvent.setup({ delay: null });
    const nav = await screen.findByRole("navigation", { name: t("competition.select") });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      twoCompetitionsSave("nomes").bank.competitions[0]?.name,
      TOURNAMENT_NAME,
    ]);
    expect(links[0]?.getAttribute("aria-current")).toBe("page");
    expect(await screen.findByRole("table", { name: /Série A/ })).toBeDefined();

    await user.click(links[1] as HTMLElement);
    const table = await screen.findByRole("table", {
      name: t("competition.caption", { division: "Divisão única" }),
    });
    expect(
      within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole("row"),
    ).toHaveLength(10);
    const again = within(
      await screen.findByRole("navigation", { name: t("competition.select") }),
    ).getAllByRole("link");
    expect(again[1]?.getAttribute("aria-current")).toBe("page");
  });

  it("a competição do próximo jogo vem selecionada", async () => {
    const { store } = await storedCareer(1, () => twoCompetitionsSave("tela"));
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await simulate(user);
    await waitFor(async () =>
      expect((await loadSaved(store)).league.divisions[0]?.nextRound).toBe(2),
    );
    await simulate(user);
    await waitFor(async () =>
      expect((await loadSaved(store)).league.divisions[0]?.nextRound).toBe(3),
    );
    cleanup();
    // O próximo jogo é a quarta do torneio.
    renderApp("/jogo/competicao/resultados?c=tela", store);
    const nav = await screen.findByRole("navigation", { name: t("competition.select") });
    const links = within(nav).getAllByRole("link");
    expect(links[1]?.getAttribute("aria-current")).toBe("page");
  });

  it("banco padrão: as telas ficam como hoje, sem abas de competição", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/competicao?c=tela", store);
    await screen.findByRole("table");
    expect(screen.queryByRole("navigation", { name: t("competition.select") })).toBeNull();
    expect(screen.getByRole("navigation", { name: t("division.tabs.label") })).toBeDefined();
  });
});

describe("finanças e notícias de jogos de outras competições (017 US6)", () => {
  beforeEach(() => {
    localStorage.clear();
    memoryRouter.url = "/jogo?c=tela";
  });

  it("um jogo em casa do torneio entra no caixa com a competição e vira manchete", async () => {
    const { store } = await storedCareer(1, () => twoCompetitionsSave("tela"));
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup({ delay: null });
    for (let day = 1; day <= 3; day++) {
      await simulate(user);
      await waitFor(async () => {
        const saved = await loadSaved(store);
        const done = saved.league.divisions[0]?.nextRound ?? 1;
        const cup = saved.competitions[0]?.divisions[0]?.nextRound ?? 1;
        expect(done - 1 + (cup - 1)).toBe(day);
      });
    }
    const saved = await loadSaved(store);
    const gates = saved.finances.gates.filter((gate) => gate.competitionId === TOURNAMENT_ID);
    expect(gates.length).toBeGreaterThan(0);
    expect(gates.every((gate) => gate.date === "2027-01-13")).toBe(true);
    const feed = saved.news.feed.flatMap((round) => round.headlines);
    expect(feed.some((headline) => headline.vars.competition === TOURNAMENT_ID)).toBe(true);
  });
});

describe("suspensão por competição no elenco (017 US7)", () => {
  beforeEach(() => {
    localStorage.clear();
    memoryRouter.url = "/jogo/elenco?c=tela";
  });

  /** Um jogador do clube suspenso por 1 jogo na liga principal. */
  function suspendedInLeague() {
    const save = twoCompetitionsSave("tela");
    const player = save.bank.players.find((entry) => entry.clubId === save.clubId);
    if (!player) throw new Error("sem jogador");
    const league = {
      ...save.league,
      divisions: save.league.divisions.map((season) =>
        season.clubIds.includes(save.clubId)
          ? {
              ...season,
              status: {
                ...season.status,
                [player.id]: { yellows: 0, suspension: 1, injury: 0 },
              },
            }
          : season,
      ),
    };
    return { save: { ...save, league }, player };
  }

  const statusOf = (table: HTMLElement, name: string) => {
    const row = within(table).getByText(name).closest("tr") as HTMLElement;
    return within(row).getAllByRole("cell")[5]?.textContent;
  };

  it("com o próximo jogo na liga, a suspensão aparece com o nome da liga", async () => {
    const { save, player } = suspendedInLeague();
    const { store } = await storedCareer(1, () => save);
    renderApp("/jogo/elenco?c=tela", store);
    const table = await screen.findByRole("table");
    const leagueName = save.bank.competitions[0]?.name ?? "";
    expect(statusOf(table, player.displayName)).toBe(
      t("squad.suspendedIn", { competition: leagueName, matches: 1 }),
    );
  });

  it("com o próximo jogo no torneio, ele está livre e a suspensão da liga é só informação", async () => {
    const { save, player } = suspendedInLeague();
    const { store } = await storedCareer(1, () => save);
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await simulate(user);
    await waitFor(async () =>
      expect((await loadSaved(store)).league.divisions[0]?.nextRound).toBe(2),
    );
    await simulate(user);
    await waitFor(async () =>
      expect((await loadSaved(store)).league.divisions[0]?.nextRound).toBe(3),
    );
    cleanup();
    renderApp("/jogo/elenco?c=tela", store);
    const table = await screen.findByRole("table");
    // Cumpriu a suspensão no jogo 1 da liga? Não: ele ficou de fora do primeiro jogo e voltou depois.
    const saved = await loadSaved(store);
    const stillSuspended = saved.league.divisions.some(
      (season) => (season.status[player.id]?.suspension ?? 0) > 0,
    );
    const text = statusOf(table, player.displayName);
    if (stillSuspended) expect(text).toContain(save.bank.competitions[0]?.name);
    else expect(text).toBe(t("squad.available"));
  });
});

describe("outras competições no fim da temporada e no histórico (017 T056)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("o resumo do fim de temporada mostra o campeão do torneio e o histórico guarda depois da virada", async () => {
    const base = twoCompetitionsSave("tela");
    let save = base;
    const managed = save.clubId;
    while (!isCareerSeasonOver(save)) {
      const day = completeCareerDay(seasonStateOf(save), save.seed, managed);
      if (!day.ok) throw new Error(JSON.stringify(day.error));
      save = withDayResult(save, day.state);
    }
    const { store } = await storedCareer(1, () => save);
    renderApp("/jogo/fim-de-temporada?c=tela", store);
    const section = await screen.findByRole("region", { name: t("history.otherCompetitions") });
    expect(section.textContent).toContain(TOURNAMENT_NAME);
    expect(within(section).getAllByRole("row")).toHaveLength(11);
    cleanup();

    const turned = advanceCareerSeason(save, "2026-10-21T00:00:00.000Z");
    if (!turned.ok) throw new Error("virada falhou");
    const { store: second } = await storedCareer(1, () => turned.save);
    renderApp("/jogo/historico?c=tela", second);
    const history = await screen.findByRole("region", { name: t("history.otherCompetitions") });
    expect(history.textContent).toContain(TOURNAMENT_NAME);
  }, 300_000);

  it("banco padrão: a seção não aparece", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/historico?c=tela", store);
    await screen.findByText(t("history.empty"));
    expect(screen.queryByRole("region", { name: t("history.otherCompetitions") })).toBeNull();
  });
});
