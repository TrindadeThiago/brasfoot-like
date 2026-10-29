import { completeCareerDay } from "@brasfoot-like/engine";
import {
  isCareerSeasonOver,
  nextFixture,
  type SaveFile,
  seasonStateOf,
  withDayResult,
} from "@brasfoot-like/save";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { eachFixture, monthGrid } from "../helpers/calendar";
import { storedCareer } from "../helpers/career";
import { loadSaved } from "../helpers/live";
import { memoryRouter } from "../helpers/router";
import { cupSave } from "../helpers/saves";

async function simulate(user: ReturnType<typeof userEvent.setup>) {
  const button = await screen.findByRole("button", { name: t("home.simulate") });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  await user.click(button);
}

describe("copa nacional no banco padrão (018 US1)", () => {
  beforeEach(() => {
    localStorage.clear();
    memoryRouter.url = "/jogo?c=copa";
  });

  it("a carreira inclui a copa e a aba de chaveamento mostra as fases", async () => {
    const { store } = await storedCareer(1, () => cupSave("copa"));
    const saved = await loadSaved(store, "copa");
    const cup = saved.competitions[0];
    expect(cup?.divisions[0]?.bracket).toBeDefined();
    memoryRouter.url = `/jogo/competicao?c=copa&comp=${cup?.competitionId}`;
    renderApp(memoryRouter.url, store);
    expect(await screen.findByRole("link", { name: t("competition.tab.bracket") })).toBeTruthy();
    expect(screen.queryByRole("link", { name: t("competition.tab.standings") })).toBeNull();
    expect((await screen.findAllByText(t("cup.toBeDefined"))).length).toBeGreaterThan(0);
    cleanup();
  });

  it("avançar alterna ligas e copa até o clube jogar um jogo da copa", async () => {
    const { store } = await storedCareer(1, () => cupSave("copa"));
    renderApp("/jogo?c=copa", store);
    const user = userEvent.setup({ delay: null });
    for (let i = 0; i < 6; i++) {
      await simulate(user);
      const saved = await loadSaved(store, "copa");
      const next = nextFixture(saved);
      if (next?.competitionId !== saved.league.competitionId) break;
    }
    const saved = await loadSaved(store, "copa");
    const cupId = saved.competitions[0]?.competitionId;
    expect(cupId).toBeDefined();
    expect(saved.competitions[0]?.divisions[0]?.records.length).toBeGreaterThan(0);
  });
});

/** Joga a temporada inteira (liga e copa) pelo mesmo caminho do jogo, com a escalação do jogador. */
function playedSeason(): SaveFile {
  let save = cupSave("copa");
  while (!isCareerSeasonOver(save)) {
    const result = completeCareerDay(seasonStateOf(save), save.seed, save.clubId, undefined, {
      [save.clubId]: save.lineup,
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    save = withDayResult(save, result.state);
  }
  return save;
}

describe("telas da copa depois de jogada (018 US6)", () => {
  const played = playedSeason();
  const cup = played.competitions[0];
  const cupId = cup?.competitionId ?? "";
  const cupFormat = played.bank.competitions.find((entry) => entry.id === cupId)?.format;
  const phaseNames = (cupFormat?.type === "knockout" ? cupFormat.phases : []).map(
    (phase) => phase.name,
  );

  beforeEach(() => {
    localStorage.clear();
  });

  it("Resultados mostra a fase no lugar do número da rodada", async () => {
    const { store } = await storedCareer(1, () => played);
    memoryRouter.url = `/jogo/competicao/resultados?c=copa&comp=${cupId}`;
    renderApp(memoryRouter.url, store);
    expect(await screen.findByRole("heading", { name: phaseNames.at(-1) as string })).toBeTruthy();
    cleanup();
  });

  it("o cartão do próximo jogo mostra a fase quando é jogo de copa", async () => {
    let save = cupSave("copa");
    while (nextFixture(save)?.competitionId !== cupId) {
      const result = completeCareerDay(seasonStateOf(save), save.seed, save.clubId, undefined, {
        [save.clubId]: save.lineup,
      });
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      save = withDayResult(save, result.state);
    }
    const { store } = await storedCareer(1, () => save);
    memoryRouter.url = "/jogo?c=copa";
    renderApp(memoryRouter.url, store);
    const card = await screen.findByRole("region", { name: t("home.nextMatch") });
    expect(phaseNames.some((name) => (card.textContent ?? "").includes(name))).toBe(true);
    cleanup();
  });

  it("o calendário do clube traz o nome da fase nas linhas da copa", async () => {
    const { store } = await storedCareer(1, () => played);
    memoryRouter.url = "/jogo/calendario?c=copa";
    renderApp(memoryRouter.url, store);
    await monthGrid();
    let found = false;
    await eachFixture(userEvent.setup({ delay: null }), ({ item }) => {
      if (phaseNames.some((name) => (item.textContent ?? "").includes(name))) found = true;
    });
    expect(found).toBe(true);
    cleanup();
  });

  it("no fim da temporada o campeão e o vice da copa aparecem", async () => {
    const { store } = await storedCareer(1, () => played);
    memoryRouter.url = "/jogo/fim-de-temporada?c=copa";
    renderApp(memoryRouter.url, store);
    expect(await screen.findByText(/^Campeão: /)).toBeTruthy();
    expect(screen.getByText(/^Vice: /)).toBeTruthy();
    cleanup();
  });

  it("Histórico ▸ Copas lista as edições; sem copa a aba não existe", async () => {
    const entry = {
      number: 1,
      year: 2027,
      competitionId: cupId,
      championId: played.clubId,
      runnerUpId: played.bank.clubs[1]?.id ?? "",
      final: {
        home: played.clubId,
        away: played.bank.clubs[1]?.id ?? "",
        score: { home: 1, away: 1 },
        decidedBy: "penalties" as const,
        shootout: { home: 4, away: 3 },
      },
      reached: {},
    };
    const { store } = await storedCareer(1, () => ({ ...played, cupHistory: [entry] }));
    memoryRouter.url = "/jogo/historico?c=copa";
    renderApp(memoryRouter.url, store);
    const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole("tab", { name: t("history.tab.cups") }));
    expect(
      await screen.findByText(t("cup.result.penalties", { home: 4, away: 3 }), { exact: false }),
    ).toBeTruthy();
    cleanup();

    const league = await storedCareer(1);
    memoryRouter.url = "/jogo/historico?c=tela";
    renderApp(memoryRouter.url, league.store);
    await screen.findByRole("tablist");
    expect(screen.queryByRole("tab", { name: t("history.tab.cups") })).toBeNull();
  });
});
