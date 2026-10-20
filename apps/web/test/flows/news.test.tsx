import { advanceCareer, latestFeed } from "@brasfoot-like/engine";
import { advanceCareerSeason, type SaveFile } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 120000 });

/** Joga a temporada inteira e faz a virada (com tudo ativo). */
function finishSeason(save: SaveFile): SaveFile {
  const played = advanceCareer(
    save.league,
    save.finances,
    save.bank,
    { toEnd: true },
    save.clubId,
    undefined,
    { state: save.renewal, careerSeed: save.seed },
    { state: save.market, careerSeed: save.seed },
    {
      state: { ...save.board, manager: { ...save.board.manager, noFiring: true } },
      careerSeed: save.seed,
    },
    { state: save.fans },
    { state: save.news, careerSeed: save.seed },
  );
  if (!played.ok || !played.news || !played.board || !played.fans) throw new Error("temporada");
  const turned = advanceCareerSeason(
    {
      ...save,
      league: played.league,
      bank: played.world,
      finances: played.finances,
      renewal: played.renewal ?? save.renewal,
      market: played.market ?? save.market,
      board: played.board,
      fans: played.fans,
      news: played.news,
    },
    "2026-10-20T00:00:00.000Z",
  );
  if (!turned.ok) throw new Error("virada");
  return turned.save;
}

describe("manchetes e histórico no app (014)", () => {
  it("Início mostra as manchetes da última rodada e leva às Notícias", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(4);
    const feed = latestFeed(save.news);
    expect(feed?.round).toBe(3);
    expect(feed?.headlines.some((headline) => headline.mine)).toBe(true);
    renderApp("/jogo?c=tela", store);
    const card = await screen.findByRole("region", { name: new RegExp(t("news.title")) });
    expect(within(card).getAllByRole("listitem").length).toBeGreaterThan(0);
    await user.click(within(card).getByRole("link", { name: t("news.seeAll") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/noticias"));
    expect(await screen.findByRole("combobox", { name: t("news.select") })).toBeDefined();
  });

  it("depois de uma temporada: resumo no feed, artilheiro, títulos, artilheiros, recordes e clubes", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(1, finishSeason);
    const summary = save.news.feed.find((round) => round.round === 0);
    expect(summary?.headlines.some((headline) => headline.type === "seasonSummary")).toBe(true);

    renderApp("/jogo/noticias?c=tela", store);
    const select = await screen.findByRole("combobox", { name: t("news.select") });
    expect(within(select).getAllByRole("option").length).toBeGreaterThan(30);

    renderApp("/jogo/historico?c=tela", store);
    const scorer = save.news.seasons[0]?.scorers[0];
    if (!scorer?.name) throw new Error("sem artilheiro");
    expect(
      await screen.findByText(
        t("history.topScorerValue", { name: scorer.name, goals: scorer.goals }),
      ),
    ).toBeDefined();
    await user.click(screen.getByRole("tab", { name: t("history.tab.titles") }));
    expect(screen.getAllByRole("table").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("tab", { name: t("history.tab.scorers") }));
    expect(screen.getByRole("table", { name: t("history.scorers.caption") })).toBeDefined();
    await user.click(screen.getByRole("tab", { name: t("history.tab.records") }));
    expect(screen.getByRole("table", { name: t("history.records.caption") })).toBeDefined();
    await user.click(screen.getByRole("tab", { name: t("history.tab.clubs") }));
    expect(screen.getByRole("combobox", { name: t("history.clubs.select") })).toBeDefined();
    expect(screen.getByRole("link", { name: t("history.managerLink") })).toBeDefined();
  });
});
