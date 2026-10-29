import { clubDivision, finalOrder, type Season } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { stageLabel } from "../../src/ui/stages/label";
import { renderApp } from "../helpers/app";
import { eachFixture, monthGrid } from "../helpers/calendar";
import { memoryRouter } from "../helpers/router";
import {
  playToSeasonEnd,
  stagesAfterSeason,
  stagesSave,
  stagesTopSave,
  storedStages,
} from "../helpers/stages";

// 019 (T036): a divisão em fases na tela da competição (US1).
describe("divisão em fases: grupos e zona de classificação (019 US1)", () => {
  beforeEach(() => {
    localStorage.clear();
    memoryRouter.url = "/jogo/competicao?c=fases";
  });

  it("mostra uma tabela por grupo, o grupo do clube primeiro, e a legenda da zona", async () => {
    const { store, save } = await storedStages(0);
    const lower = clubDivision(save.league, save.clubId);
    const mine = lower?.stages?.[0]?.groups?.find((group) => group.clubIds.includes(save.clubId));
    expect(mine).toBeDefined();
    renderApp(memoryRouter.url, store);
    const section = await screen.findByRole("region", { name: t("stages.groups") });
    const tables = within(section).getAllByRole("table");
    expect(tables).toHaveLength(4);
    const names = tables.map((table) => within(table).getByRole("caption").textContent);
    expect(names[0]).toBe(t("stages.group", { group: mine?.id ?? "" }));
    expect(new Set(names).size).toBe(4);
    for (const table of tables) {
      expect(within(table).getAllByText(t("stages.zone.qualified"))).toHaveLength(2);
    }
    expect(screen.getAllByText(t("stages.zone.legend", { qualified: 2, extra: "no" })).length).toBe(
      4,
    );
    cleanup();
  });

  it("depois dos grupos, o chaveamento mostra a origem de cada vaga", async () => {
    const { store } = await storedStages(5);
    renderApp(memoryRouter.url, store);
    expect(await screen.findByRole("region", { name: t("cup.bracket") })).toBeTruthy();
    for (const group of ["A", "B", "C", "D"]) {
      expect(screen.getAllByText(t("stages.origin.group", { position: 1, group })).length).toBe(1);
      expect(screen.getAllByText(t("stages.origin.group", { position: 2, group })).length).toBe(1);
    }
    cleanup();
  });

  it("avisa quando o sorteio teve de afrouxar uma separação", async () => {
    const { store, save } = await storedStages(0, "fases", (base: SaveFile) => {
      const level = clubDivision(base.league, base.clubId)?.divisionLevel;
      const [first, second] = clubDivision(base.league, base.clubId)?.stages?.[0]?.clubIds ?? [];
      return {
        ...base,
        league: {
          ...base.league,
          divisions: base.league.divisions.map((season: Season) =>
            season.divisionLevel === level
              ? {
                  ...season,
                  stages: (season.stages ?? []).map((stage) =>
                    stage.index === 0
                      ? {
                          ...stage,
                          warnings: [
                            {
                              stage: 0,
                              rule: { kind: "separate" as const, attribute: "country" as const },
                              clubIds: [first as string, second as string],
                            },
                          ],
                        }
                      : stage,
                  ),
                }
              : season,
          ),
        },
      };
    });
    const names = (ids: string[]) =>
      ids.map((id) => save.bank.clubs.find((club) => club.id === id)?.name ?? id).join(", ");
    const lower = clubDivision(save.league, save.clubId);
    const [first, second] = lower?.stages?.[0]?.clubIds ?? [];
    renderApp(memoryRouter.url, store);
    const notice = await screen.findByRole("status", { name: t("stages.drawNotice.title") });
    expect(notice.textContent).toContain(
      t("stages.drawNotice.separate", {
        stage: 1,
        attribute: "country",
        clubs: names([first as string, second as string]),
      }),
    );
    cleanup();
  });
});

describe("telas completas das fases (019 US6)", () => {
  beforeEach(() => {
    localStorage.clear();
    memoryRouter.url = "/jogo/competicao?c=fases";
  });

  it("a navegação lista as fases, marca a atual e abre uma fase já jogada", async () => {
    const { store } = await storedStages(5);
    memoryRouter.url = "/jogo/competicao?c=fases&fase=0";
    renderApp(memoryRouter.url, store);
    const nav = await screen.findByRole("navigation", { name: t("stages.nav.label") });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      t("stages.nav.item", { number: 1, kind: "groups" }),
      t("stages.nav.item", { number: 2, kind: "knockout" }),
    ]);
    expect(links[0]?.getAttribute("aria-current")).toBe("page");
    expect((await screen.findAllByRole("table")).length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByRole("region", { name: t("cup.bracket") })).toBeNull();
    cleanup();
  });

  it("sem a fase na URL abre a que está em andamento", async () => {
    const { store } = await storedStages(5);
    renderApp(memoryRouter.url, store);
    const nav = await screen.findByRole("navigation", { name: t("stages.nav.label") });
    const links = within(nav).getAllByRole("link");
    expect(links[1]?.getAttribute("aria-current")).toBe("page");
    expect(await screen.findByRole("region", { name: t("cup.bracket") })).toBeTruthy();
    cleanup();
  });

  it("a classificação geral ordena os 20 clubes e marca quem se classificaria hoje", async () => {
    const { store } = await storedStages(3);
    memoryRouter.url = "/jogo/competicao?c=fases&fase=0";
    renderApp(memoryRouter.url, store);
    const overall = await screen.findByRole("table", { name: t("stages.overall.caption") });
    expect(within(overall).getAllByRole("row")).toHaveLength(21);
    expect(within(overall).getAllByText(t("stages.zone.qualifiedToday"))).toHaveLength(8);
    cleanup();
  });

  it("marca quem cairia hoje quando a divisão em fases rebaixa", async () => {
    const { store } = await storedStages(3, "fases-topo", undefined, stagesTopSave("fases-topo"));
    memoryRouter.url = "/jogo/competicao?c=fases-topo&fase=0";
    renderApp(memoryRouter.url, store);
    const overall = await screen.findByRole("table", { name: t("stages.overall.caption") });
    expect(within(overall).getAllByText(t("stages.zone.relegationToday"))).toHaveLength(2);
    cleanup();
  });

  it("o Início mostra o grupo e a rodada do próximo jogo", async () => {
    const { store, save } = await storedStages(2);
    memoryRouter.url = "/jogo?c=fases";
    renderApp(memoryRouter.url, store);
    const group = clubDivision(save.league, save.clubId)?.stages?.[0]?.groups?.find((entry) =>
      entry.clubIds.includes(save.clubId),
    );
    const next = await screen.findByRole("region", { name: t("home.nextMatch") });
    expect(next.textContent).toContain(
      t("stages.label.group", { group: group?.id ?? "", round: 3 }),
    );
    cleanup();
  });

  it("o calendário mostra a fase com o grupo e a rodada de cada jogo", async () => {
    const { store } = await storedStages(0);
    memoryRouter.url = "/jogo/calendario?c=fases";
    renderApp(memoryRouter.url, store);
    await monthGrid();
    const phases: string[] = [];
    await eachFixture(userEvent.setup({ delay: null }), ({ item }) => {
      const match = /Fase: (Grupo [A-D], rodada \d)/.exec(item.textContent ?? "");
      if (match?.[1]) phases.push(match[1]);
    });
    expect(phases).toHaveLength(4);
    cleanup();
  }, 60_000);

  it("o rótulo de um jogo eliminatório é o nome da fase, com a perna se for ida e volta", () => {
    const save = stagesSave("rotulo");
    const lower = clubDivision(save.league, save.clubId);
    const fixture = {
      day: 0,
      date: "2027-01-01",
      competitionId: lower?.competitionId ?? "",
      divisionLevel: lower?.divisionLevel ?? 2,
      round: 7,
      home: "a",
      away: "b",
      stage: { index: 1, kind: "knockout" as const },
      stageRound: 2,
      tie: { phase: 1, id: "f1-0", leg: 1 as const, legs: 1 as const },
    };
    expect(stageLabel(save, fixture)).toBe("Semifinal");
  });
});

describe("fim da temporada e histórico de uma divisão em fases (019 US6)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("o resumo lista a posição final de cada clube, com o campeão em primeiro", async () => {
    const finished = playToSeasonEnd(stagesSave("fim"));
    const { store } = await storedStages(0, "fim", undefined, finished);
    memoryRouter.url = "/jogo/fim-de-temporada?c=fim";
    renderApp(memoryRouter.url, store);
    const section = await screen.findByRole("region", {
      name: t("stages.finalPositions", { division: divisionNameOf(finished, 2) }),
    });
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(20);
    const lower = clubDivision(finished.league, finished.clubId);
    const order = lower ? finalOrder(lower, finished.bank) : [];
    const champion = finished.bank.clubs.find((club) => club.id === order[0])?.name ?? "";
    expect(items[0]?.textContent).toContain(champion);
    expect(items[0]?.textContent).toContain("1º");
    cleanup();
  }, 120_000);

  it("o histórico guarda o campeão da divisão em fases", async () => {
    const save = stagesAfterSeason("hist");
    const { store } = await storedStages(0, "hist", undefined, save);
    memoryRouter.url = "/jogo/historico?c=hist";
    renderApp(memoryRouter.url, store);
    const lower = save.history[0]?.divisions.find((division) => division.level === 2);
    const champion = save.bank.clubs.find((club) => club.id === lower?.championId)?.name ?? "";
    expect((await screen.findAllByText(champion)).length).toBeGreaterThan(0);
    cleanup();
  }, 180_000);
});
