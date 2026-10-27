import { regionalCompetitionOf } from "@brasfoot-like/engine";
import { advanceCareerSeason, isCareerSeasonOver } from "@brasfoot-like/save";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";
import { playedRegionalSeason, regionalSave } from "../helpers/saves";

vi.setConfig({ testTimeout: 180000 });

describe("estadual ao lado das competições nacionais (023 US3)", () => {
  beforeEach(() => localStorage.clear());

  it("a aba do estadual da região do clube aparece junto das nacionais; os dos outros estados não", async () => {
    const save = regionalSave("abas");
    const own = regionalCompetitionOf(save.bank, save.clubId);
    const others = save.bank.competitions.filter(
      (entry) => entry.regional !== undefined && entry.id !== own?.id,
    );
    expect(others.length).toBeGreaterThan(0);
    const { store } = await storedCareer(1, () => save);
    memoryRouter.url = "/jogo/competicao?c=abas";
    renderApp(memoryRouter.url, store);
    const nav = await screen.findByRole("navigation", { name: t("competition.select") });
    const links = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(links).toContain(own?.name);
    for (const other of others) expect(links).not.toContain(other.name);
    cleanup();
  });

  it("a tela do estadual mostra as duas divisões e a fase de grupos", async () => {
    const save = regionalSave("tela");
    const own = regionalCompetitionOf(save.bank, save.clubId);
    const { store } = await storedCareer(1, () => save);
    memoryRouter.url = `/jogo/competicao?c=tela&comp=${own?.id}`;
    renderApp(memoryRouter.url, store);
    const nav = await screen.findByRole("navigation", { name: t("competition.select") });
    const current = within(nav)
      .getAllByRole("link")
      .find((link) => link.getAttribute("aria-current") === "page");
    expect(current?.textContent).toBe(own?.name);
    const divisions = await screen.findByRole("navigation", { name: t("division.tabs.label") });
    const tabs = within(divisions).getAllByRole("link");
    expect(tabs).toHaveLength(2);
    // O clube do técnico está na primeira divisão: a aba dele leva a marca de "minha divisão".
    expect(tabs[0]?.textContent).toContain(own?.divisions[0]?.name);
    expect(tabs[1]?.textContent).toContain(own?.divisions[1]?.name);
    cleanup();
  });
});

describe("o peso do estadual na carreira (023 US3)", () => {
  beforeEach(() => localStorage.clear());
  const played = playedRegionalSeason("peso");

  it("termina a temporada e a diretoria mostra a meta do estadual quando o clube tem uma", async () => {
    expect(isCareerSeasonOver(played)).toBe(true);
    const goal = played.board.clubs[played.clubId]?.goals?.regional;
    const { store } = await storedCareer(1, () => played);
    memoryRouter.url = "/jogo/carreira?c=peso";
    renderApp(memoryRouter.url, store);
    if (goal) {
      expect(await screen.findByText(t("board.goal.regional"))).toBeTruthy();
      expect(goal.result).toBeDefined();
    } else {
      expect(await screen.findByText(t("board.goal.finance"))).toBeTruthy();
    }
    cleanup();
  });

  it("depois da virada, o histórico ganha a aba dos estaduais", async () => {
    const turned = advanceCareerSeason(played, "2026-10-27T12:00:00.000Z");
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    const next = { ...turned.save, id: "virada" };
    expect(next.regionalHistory?.length).toBe(3);
    const { store } = await storedCareer(1, () => next);
    memoryRouter.url = "/jogo/historico?c=virada";
    renderApp(memoryRouter.url, store);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: t("history.tab.regional") }));
    expect(await screen.findByRole("table", { name: t("regional.history.tab") })).toBeTruthy();
    cleanup();
  });
});
