import { advanceLeague, divisionSeason, topScorers } from "@brasfoot-like/engine";
import { type SaveFile, userSeason } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { elapse, loadSaved, useRoundClock } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

function bodyRows(table: HTMLElement): HTMLElement[] {
  return within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole("row");
}

function directLeague(save: SaveFile) {
  const result = advanceLeague(
    save.league,
    save.bank,
    { rounds: 1 },
    {
      [save.clubId]: save.lineup,
    },
  );
  if (!result.ok) throw new Error("falhou");
  return result.league;
}

describe("duas divisões em paralelo (US1)", () => {
  describe("rodada ao vivo", () => {
    beforeEach(() => {
      localStorage.clear();
      useRoundClock();
    });
    afterEach(() => vi.useRealTimers());

    it("mostra só a divisão do jogador e, no fim, leva aos resultados da outra", async () => {
      const { store, save } = await storedCareer(1);
      renderApp("/jogo?c=tela", store);
      const user = userEvent.setup({ delay: null });
      await user.click(await screen.findByRole("button", { name: t("home.playLive") }));
      await screen.findByRole("region", { name: t("round.myMatch") });
      const others = screen.getByRole("region", { name: t("round.otherMatches") });
      expect(within(others).getAllByRole("listitem")).toHaveLength(9);
      const serieB = new Set(divisionSeason(save.league, 2)?.clubIds);
      const names = save.bank.clubs
        .filter((club) => serieB.has(club.id))
        .map((club) => club.shortName);
      const text = others.textContent ?? "";
      expect(names.some((name) => text.includes(name))).toBe(false);

      await elapse(60_000);
      await waitFor(async () => expect(userSeason(await loadSaved(store)).nextRound).toBe(2));
      const saved = await loadSaved(store);
      expect(saved.league).toEqual(directLeague(save));
      const link = await screen.findByRole("link", {
        name: t("round.otherDivisionResults", { division: "Série B" }),
      });
      await user.click(link);
      expect(memoryRouter.pathname()).toBe("/jogo/competicao/resultados");
      expect(memoryRouter.searchParams().get("d")).toBe("2");
      expect(memoryRouter.searchParams().get("r")).toBe("1");
      const region = await screen.findByRole("region", {
        name: t("results.caption", { round: 1 }),
      });
      const items = within(region).getAllByRole("listitem");
      expect(items).toHaveLength(10);
      const record = divisionSeason(saved.league, 2)?.records.find(
        (entry) => entry.home === divisionSeason(saved.league, 2)?.calendar[0]?.fixtures[0]?.home,
      );
      expect(items[0]?.textContent).toContain(`${record?.score.home} × ${record?.score.away}`);
    });
  });

  describe("competição", () => {
    it("classificação da divisão do jogador por padrão, troca por abas e por [ ]", async () => {
      const { store } = await storedCareer(3);
      renderApp("/jogo/competicao?c=tela", store);
      const tabs = await screen.findByRole("navigation", { name: t("division.tabs.label") });
      const mine = within(tabs).getByRole("link", {
        name: t("division.mine", { division: "Série A" }),
      });
      expect(mine.getAttribute("aria-current")).toBe("page");
      await screen.findByRole("table", {
        name: t("competition.caption", { division: "Série A" }),
      });

      const user = userEvent.setup();
      await user.click(within(tabs).getByRole("link", { name: "Série B" }));
      expect(memoryRouter.searchParams().get("d")).toBe("2");
      await screen.findByRole("table", {
        name: t("competition.caption", { division: "Série B" }),
      });

      await user.keyboard("[[");
      expect(memoryRouter.searchParams().get("d")).toBe("1");
      await user.keyboard("]");
      expect(memoryRouter.searchParams().get("d")).toBe("2");
    });

    it("marca 4 de rebaixamento na Série A e 4 de acesso na Série B, com legenda", async () => {
      const { store } = await storedCareer(3);
      renderApp("/jogo/competicao?c=tela&d=1", store);
      const serieA = await screen.findByRole("table", {
        name: t("competition.caption", { division: "Série A" }),
      });
      const rowsA = bodyRows(serieA);
      const relegated = rowsA.filter((row) =>
        row.textContent?.includes(t("standings.zone.relegation")),
      );
      expect(relegated).toHaveLength(4);
      expect(rowsA.slice(16)).toEqual(relegated);
      expect(
        screen.getByText(t("standings.zone.legend", { promotion: 0, relegation: 4, both: "no" })),
      ).toBeDefined();

      memoryRouter.push("/jogo/competicao?c=tela&d=2");
      const serieB = await screen.findByRole("table", {
        name: t("competition.caption", { division: "Série B" }),
      });
      const rowsB = bodyRows(serieB);
      const promoted = rowsB.filter((row) =>
        row.textContent?.includes(t("standings.zone.promotion")),
      );
      expect(promoted).toHaveLength(4);
      expect(rowsB.slice(0, 4)).toEqual(promoted);
    });

    it("resultados e artilharia respeitam a divisão escolhida", async () => {
      const { store, save } = await storedCareer(6);
      renderApp("/jogo/competicao/resultados?c=tela&d=2&r=5", store);
      const region = await screen.findByRole("region", {
        name: t("results.caption", { round: 5 }),
      });
      const serieB = divisionSeason(save.league, 2);
      const record = serieB?.records.find(
        (entry) => entry.round === 5 && entry.home === serieB.calendar[4]?.fixtures[0]?.home,
      );
      expect(within(region).getAllByRole("listitem")[0]?.textContent).toContain(
        `${record?.score.home} × ${record?.score.away}`,
      );

      memoryRouter.push("/jogo/competicao/artilharia?c=tela&d=2");
      const table = await screen.findByRole("table", { name: t("scorers.goals") });
      const first = serieB ? topScorers(serieB, 1)[0] : undefined;
      const name = save.bank.players.find((player) => player.id === first?.playerId)?.displayName;
      expect(within(bodyRows(table)[0] as HTMLElement).getAllByRole("cell")[0]?.textContent).toBe(
        name,
      );
    });
  });
});
