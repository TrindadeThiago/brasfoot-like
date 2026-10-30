import { advanceCareerSeason, type SaveFile } from "@brasfoot-like/save";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { eachFixture, monthGrid } from "../helpers/calendar";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";
import { careerSave, playedQualificationSeason, qualificationSave } from "../helpers/saves";

vi.setConfig({ testTimeout: 120000 });

const NOW = "2026-10-24T12:00:00.000Z";

function names(save: SaveFile) {
  const league = save.bank.competitions.find((entry) => entry.id === save.league.competitionId);
  const supercup = save.bank.competitions.find((entry) => entry.id.startsWith("supercopa-"));
  return { league, supercup };
}

describe("zonas de vaga na tabela (021 US1)", () => {
  beforeEach(() => localStorage.clear());

  it("mostra a faixa e a legenda das posições que dão vaga", async () => {
    const save = qualificationSave("vagas");
    const { league, supercup } = names(save);
    const { store } = await storedCareer(1, () => save);
    memoryRouter.url = `/jogo/competicao?c=vagas&comp=${league?.id}`;
    renderApp(memoryRouter.url, store);
    const tag = t("standings.zone.berth", { competition: supercup?.name ?? "" });
    expect((await screen.findAllByText(tag)).length).toBeGreaterThan(0);
    expect(
      screen.getByText(new RegExp(`Posição 1: vaga em ${supercup?.name}`.replace(/[()]/g, "\\$&"))),
    ).toBeTruthy();
    cleanup();
  });

  it("sem vagas no banco, nenhuma zona nova aparece", async () => {
    const { store } = await storedCareer(1, () => careerSave("sem-vagas"));
    memoryRouter.url = "/jogo/competicao?c=sem-vagas";
    renderApp(memoryRouter.url, store);
    await screen.findByRole("table");
    expect(screen.queryByText(/^Vaga: /)).toBeNull();
    expect(screen.queryByText(/vaga em /)).toBeNull();
    cleanup();
  });
});

describe("origem dos participantes e fim de temporada (021 US2, US6)", () => {
  beforeEach(() => localStorage.clear());
  const played = playedQualificationSeason("fim");

  it("a página da competição da primeira edição mostra o banco inicial como origem", async () => {
    const save = qualificationSave("origem");
    const { supercup } = names(save);
    const { store } = await storedCareer(1, () => save);
    memoryRouter.url = `/jogo/competicao?c=origem&comp=${supercup?.id}`;
    renderApp(memoryRouter.url, store);
    expect(await screen.findByRole("region", { name: t("origin.title") })).toBeTruthy();
    expect((await screen.findAllByText(t("origin.bank"))).length).toBe(2);
    cleanup();
  });

  it("o fim da temporada mostra as classificações da próxima", async () => {
    const { store } = await storedCareer(1, () => played);
    memoryRouter.url = "/jogo/fim-de-temporada?c=fim";
    renderApp(memoryRouter.url, store);
    const section = await screen.findByRole("region", { name: t("qualification.title") });
    const { supercup } = names(played);
    expect(within(section).getAllByText(supercup?.name ?? "").length).toBeGreaterThanOrEqual(2);
    cleanup();
  });

  it("depois da virada, a origem e o histórico mostram o caminho de cada vaga", async () => {
    const turned = advanceCareerSeason(played, NOW);
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const next = { ...turned.save, id: "virada" };
    const { supercup } = names(next);
    const { store } = await storedCareer(1, () => next);
    memoryRouter.url = `/jogo/competicao?c=virada&comp=${supercup?.id}`;
    renderApp(memoryRouter.url, store);
    const region = await screen.findByRole("region", { name: t("origin.title") });
    expect(within(region).getAllByText(/Campeão de|Vice-campeão de|Vaga repassada/).length).toBe(2);
    cleanup();

    memoryRouter.url = "/jogo/historico?c=virada&t=1";
    renderApp(memoryRouter.url, store);
    expect(
      await screen.findByRole("region", {
        name: t("qualification.history", { year: played.league.year }),
      }),
    ).toBeTruthy();
    cleanup();
  });
});

describe("calendário, metas e manchetes (021 US3, US6)", () => {
  beforeEach(() => localStorage.clear());

  it("o calendário do clube traz a supercopa da primeira edição", async () => {
    const save = qualificationSave("calendario");
    const { supercup } = names(save);
    const { store } = await storedCareer(1, () => save);
    memoryRouter.url = "/jogo/calendario?c=calendario";
    renderApp(memoryRouter.url, store);
    await monthGrid();
    let found = false;
    await eachFixture(userEvent.setup({ delay: null }), ({ item }) => {
      if ((item.textContent ?? "").includes(supercup?.name ?? "?")) found = true;
    });
    expect(found).toBe(true);
    cleanup();
  });

  it("a meta de classificar mostra a competição de destino", async () => {
    const base = qualificationSave("meta");
    const taca = base.bank.competitions.find((entry) => entry.id.startsWith("taca-"));
    const goals = base.board.clubs[base.clubId]?.goals;
    if (!taca || !goals) throw new Error("sem taça ou metas");
    const save: SaveFile = {
      ...base,
      board: {
        ...base.board,
        clubs: {
          ...base.board.clubs,
          [base.clubId]: {
            ...(base.board.clubs[base.clubId] as NonNullable<(typeof base.board.clubs)[string]>),
            goals: {
              ...goals,
              sport: { ...goals.sport, tier: "qualify", position: 2, competitionId: taca.id },
            },
          },
        },
      },
    };
    const { store } = await storedCareer(1, () => save);
    memoryRouter.url = "/jogo/carreira?c=meta";
    renderApp(memoryRouter.url, store);
    expect(
      await screen.findByText(t("board.goal.tier.qualify", { competition: taca.name })),
    ).toBeTruthy();
    cleanup();
  });

  it("depois da virada, a manchete de classificação aparece nas notícias", async () => {
    const turned = advanceCareerSeason(playedQualificationSeason("noticia"), NOW);
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const next = { ...turned.save, id: "noticia" };
    const headlines = next.news.feed.flatMap((round) => round.headlines);
    expect(headlines.some((headline) => headline.type === "qualification")).toBe(true);
    const { store } = await storedCareer(1, () => next);
    memoryRouter.url = "/jogo/noticias?c=noticia";
    renderApp(memoryRouter.url, store);
    const pattern = /garante vaga em|Classificado!|Vaga confirmada/;
    expect((await screen.findAllByText(pattern)).length).toBeGreaterThan(0);
    cleanup();
  });
});
