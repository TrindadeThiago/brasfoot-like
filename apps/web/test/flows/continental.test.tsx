import { advanceCareerSeason, isCareerSeasonOver } from "@brasfoot-like/save";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";
import { continentalSave, playedContinentalSeason } from "../helpers/saves";

vi.setConfig({ testTimeout: 180000 });

function continental(save: ReturnType<typeof continentalSave>) {
  const competition = save.bank.competitions.find((entry) => entry.countryId === undefined);
  if (!competition) throw new Error("banco sem a taça continental");
  return competition;
}

describe("taça continental ao lado das competições nacionais (022 US1)", () => {
  beforeEach(() => localStorage.clear());

  it("a aba da taça aparece junto das competições do país e leva à tela dela", async () => {
    const save = continentalSave("abas");
    const cup = continental(save);
    const { store } = await storedCareer(1, () => save);
    memoryRouter.url = "/jogo/competicao?c=abas";
    renderApp(memoryRouter.url, store);
    const nav = await screen.findByRole("navigation", { name: t("competition.select") });
    const links = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(links).toContain(cup.name);
    expect(links.length).toBeGreaterThanOrEqual(3);
    cleanup();

    memoryRouter.url = `/jogo/competicao?c=abas&comp=${cup.id}`;
    renderApp(memoryRouter.url, store);
    const onCup = await screen.findByRole("navigation", { name: t("competition.select") });
    const current = within(onCup)
      .getAllByRole("link")
      .find((link) => link.getAttribute("aria-current") === "page");
    expect(current?.textContent).toBe(cup.name);
    // As competições do país continuam à mão na tela da taça.
    expect(within(onCup).getAllByRole("link").length).toBe(links.length);
    cleanup();
  });

  it("o calendário do clube traz os jogos da taça nas datas de meio de semana", async () => {
    const save = continentalSave("calendario");
    const cup = continental(save);
    const { store } = await storedCareer(1, () => save);
    memoryRouter.url = "/jogo/calendario?c=calendario";
    renderApp(memoryRouter.url, store);
    const table = await screen.findByRole("table");
    expect((table.textContent ?? "").includes(cup.name)).toBe(true);
    cleanup();
  });

  it("joga liga, copa nacional e taça até o fim da temporada e a tela da taça abre", async () => {
    const played = playedContinentalSeason("fim");
    expect(isCareerSeasonOver(played)).toBe(true);
    const cup = continental(played);
    const { store } = await storedCareer(1, () => played);
    memoryRouter.url = `/jogo/competicao?c=fim&comp=${cup.id}`;
    renderApp(memoryRouter.url, store);
    expect(await screen.findByRole("navigation", { name: t("competition.select") })).toBeTruthy();
    cleanup();
  });
});

describe("o peso da campanha continental na carreira (022 US2)", () => {
  beforeEach(() => localStorage.clear());
  const played = playedContinentalSeason("peso");
  const cup = continental(played);

  it("o extrato mostra os prêmios com a competição de origem", async () => {
    const { store } = await storedCareer(1, () => played);
    memoryRouter.url = "/jogo/financas?c=peso";
    renderApp(memoryRouter.url, store);
    const table = await screen.findByRole("table", { name: t("finance.prizes.title") });
    expect(within(table).getAllByText(cup.name).length).toBeGreaterThan(0);
    cleanup();
  });

  it("a diretoria mostra a meta continental e o resultado", async () => {
    const { store } = await storedCareer(1, () => played);
    memoryRouter.url = "/jogo/carreira?c=peso";
    renderApp(memoryRouter.url, store);
    expect(await screen.findByText(t("board.goal.continental"))).toBeTruthy();
    const goal = played.board.clubs[played.clubId]?.goals?.continental;
    expect(goal?.result).toBeDefined();
    cleanup();
  });

  it("as notícias registram o campeão continental", async () => {
    const champions = played.news.feed.flatMap((round) =>
      round.headlines.filter(
        (headline) =>
          headline.type === "continentalChampion" && headline.vars.competition === cup.id,
      ),
    );
    expect(champions).toHaveLength(1);
    const { store } = await storedCareer(1, () => played);
    memoryRouter.url = "/jogo/noticias?c=peso";
    renderApp(memoryRouter.url, store);
    const club = played.bank.clubs.find((entry) => entry.id === champions[0]?.vars.club);
    expect((await screen.findAllByText(new RegExp(club?.name ?? "?"))).length).toBeGreaterThan(0);
    cleanup();
  });

  it("depois da virada, o histórico ganha a aba dos campeões continentais", async () => {
    const turned = advanceCareerSeason(played, "2026-10-25T12:00:00.000Z");
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const next = { ...turned.save, id: "virada" };
    // Uma edição de cada competição entre países (a maior e a menor).
    expect(next.continentalHistory).toHaveLength(2);
    const { store } = await storedCareer(1, () => next);
    memoryRouter.url = "/jogo/historico?c=virada";
    renderApp(memoryRouter.url, store);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: t("history.tab.continental") }));
    const table = await screen.findByRole("table", { name: t("continental.history.tab") });
    const champion = next.bank.clubs.find(
      (entry) =>
        entry.id ===
        next.continentalHistory?.find((edition) => edition.competitionId === cup.id)?.championId,
    );
    expect(within(table).getAllByText(champion?.name ?? "?").length).toBeGreaterThan(0);
    cleanup();
  });
});

describe("grupos, chaveamento e campanha do clube (022 US4)", () => {
  beforeEach(() => localStorage.clear());

  it("da tela de competições à campanha em um toque, com grupos e a zona que desce à menor", async () => {
    const save = playedContinentalSeason("campanha", 6);
    const cup = continental(save);
    const minor = save.bank.competitions.find((entry) => entry.id.endsWith("menor"));
    const { store } = await storedCareer(1, () => save);
    memoryRouter.url = "/jogo/competicao?c=campanha";
    renderApp(memoryRouter.url, store);
    const user = userEvent.setup();
    const nav = await screen.findByRole("navigation", { name: t("competition.select") });
    await user.click(within(nav).getByRole("link", { name: cup.name }));
    const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
    const panel = await screen.findByRole("region", {
      name: t("continental.campaign.title", { club: club?.name ?? "" }),
    });
    expect(within(panel).getByText(t("continental.campaign.status.playing"))).toBeTruthy();
    expect(
      within(panel).getByRole("table", { name: t("continental.campaign.matches") }),
    ).toBeTruthy();
    // Grupos com a posição que desce para a menor marcada.
    expect((await screen.findAllByRole("table")).length).toBeGreaterThan(2);
    expect(
      (await screen.findAllByText(t("standings.zone.berth", { competition: minor?.name ?? "" })))
        .length,
    ).toBeGreaterThan(0);
    cleanup();
  });

  it("quem não disputa a competição vê a tela dela, sem a campanha", async () => {
    const save = continentalSave("fora", false);
    const cup = continental(save);
    const { store } = await storedCareer(1, () => save);
    memoryRouter.url = `/jogo/competicao?c=fora&comp=${cup.id}`;
    renderApp(memoryRouter.url, store);
    expect(await screen.findByRole("navigation", { name: t("competition.select") })).toBeTruthy();
    expect(screen.queryByRole("region", { name: /Campanha do/ })).toBeNull();
    expect((await screen.findAllByRole("table")).length).toBeGreaterThan(0);
    cleanup();
  });
});
