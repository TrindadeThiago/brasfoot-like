// 029 US4: abas Histórico e Técnicos (passagens, temporadas, técnicos da divisão, vagas, estados vazios).
import type { ManagerSeasonRecord } from "@brasfoot-like/engine";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { unemployed } from "../helpers/career-board";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/carreira?c=tela");
});

async function openTab(key: string, edit?: Parameters<typeof storedCareer>[1]) {
  const career = await storedCareer(4, edit);
  renderApp("/jogo/carreira?c=tela", career.store);
  const user = userEvent.setup({ delay: null });
  await user.click(await screen.findByRole("tab", { name: t(key) }));
  return { ...career, user };
}

describe("Histórico do técnico (029)", () => {
  it("lista as passagens com o clube, o período e a saída", async () => {
    const { save } = await openTab("career.tab.history");
    const table = await screen.findByRole("table", { name: t("career.history.stints") });
    const clubName = save.bank.clubs.find((club) => club.id === save.clubId)?.name ?? "";
    expect(within(table).getByText(clubName)).toBeDefined();
    expect(within(table).getByText(t("career.history.current"), { exact: false })).toBeDefined();
  });

  it("sem temporada encerrada, o estado vazio diz isso", async () => {
    await openTab("career.tab.history");
    expect(await screen.findByText(t("career.history.empty"))).toBeDefined();
  });

  it("as temporadas trazem divisão, posição, meta, conquistas, decisão e reputação", async () => {
    const record = (save: { clubId: string; league: { year: number } }): ManagerSeasonRecord => ({
      season: 1,
      year: save.league.year,
      clubId: save.clubId,
      level: 1,
      position: 3,
      goals: {
        sportTier: "title",
        sportPosition: 1,
        sportMet: false,
        financeKind: "nonNegativeCash",
        financeMet: true,
      },
      achievements: ["title"],
      reputation: 61,
      decision: "kept",
    });
    await openTab("career.tab.history", (save) => ({
      ...save,
      board: {
        ...save.board,
        history: { ...save.board.history, seasons: [record(save)] },
      },
    }));
    const table = await screen.findByRole("table", { name: t("career.history.seasons") });
    const row = within(table).getAllByRole("row")[1] as HTMLElement;
    expect(row.textContent).toContain("3º");
    expect(row.textContent).toContain(t("board.evaluation.achievement.title"));
    expect(row.textContent).toContain(t("board.evaluation.decision.kept"));
    expect(row.textContent).toContain("61");
    expect(row.textContent).toMatch(/não cumprida/);
  });

  it("sem passagem nenhuma, o estado vazio diz isso", async () => {
    await openTab("career.tab.history", (save) => ({
      ...save,
      board: { ...save.board, history: { ...save.board.history, stints: [] } },
    }));
    expect(await screen.findByText(t("career.history.noStints"))).toBeDefined();
  });

  it("desempregado, o histórico segue funcionando", async () => {
    await openTab("career.tab.history", unemployed);
    expect(await screen.findByRole("table", { name: t("career.history.stints") })).toBeDefined();
    expect(screen.getByText(t("career.history.unemployedPeriod"))).toBeDefined();
  });
});

describe("Técnicos (029)", () => {
  it("mostra a tabela da divisão com reputação e confiança e o jogador destacado", async () => {
    const { save } = await openTab("career.tab.coaches");
    const level = save.league.divisions[0]?.divisionLevel ?? 1;
    const table = await screen.findByRole("table", { name: /^Técnicos da / });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/[▲▼]/g, "").trim());
    expect(headers).toEqual([
      t("career.coaches.club"),
      t("career.coaches.coach"),
      t("career.coaches.reputation"),
      t("career.coaches.confidence"),
    ]);
    const you = within(table).getByText(t("career.coaches.you", { name: save.managerName }));
    expect(you.closest("tr")?.getAttribute("aria-current")).toBe("true");
    expect(level).toBeGreaterThan(0);
  });

  it("uma vaga aparece escrita como vaga", async () => {
    await openTab("career.tab.coaches", (save) => {
      const board = structuredClone(save.board);
      const target = Object.keys(board.clubs).find((id) => id !== save.clubId) as string;
      const coach = board.coaches.find((entry) => entry.clubId === target);
      if (coach) coach.clubId = null;
      (board.clubs[target] as { coachId: string | null }).coachId = null;
      board.vacancies.push({
        id: "vacancy-b",
        clubId: target,
        season: 1,
        round: 0,
        considered: false,
      });
      return { ...save, board };
    });
    expect(await screen.findByText(t("career.coaches.vacant"))).toBeDefined();
  });

  it("desempregado, a tabela de técnicos segue mostrando as vagas e os técnicos", async () => {
    await openTab("career.tab.coaches", unemployed);
    expect(await screen.findByRole("table", { name: /^Técnicos da / })).toBeDefined();
  });
});
