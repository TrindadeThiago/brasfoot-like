// 030 US7, SC-002: uma rodada de 10 jogos em velocidade rápida termina sem erro e sem travar a tela.
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { TIMELINE_LIMIT } from "../../src/ui/EventFeed";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { elapse, useRoundClock } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 180000 });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    "brasfoot-like:preferences",
    JSON.stringify({ autoPause: false, roundMode: "live", roundSpeed: "fast" }),
  );
  useRoundClock();
});
afterEach(() => vi.useRealTimers());

describe("rodada de 10 jogos em velocidade rápida (030)", () => {
  it("termina sem erro, cada atualização é rápida e as listas têm teto", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole("button", { name: t("home.playLive") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/rodada"));
    await screen.findByRole("region", { name: t("round.myMatch") });
    const others = () =>
      within(screen.getByRole("region", { name: t("round.otherMatches") })).getAllByRole(
        "listitem",
      );
    expect(others()).toHaveLength(9);

    const times: number[] = [];
    let timeline = 0;
    for (let step = 0; step < 80; step++) {
      const start = Date.now();
      await elapse(500);
      times.push(Date.now() - start);
      if (screen.queryByRole("region", { name: t("home.lastRound", { round: 1 }) })) break;
      timeline = Math.max(
        timeline,
        within(screen.getByRole("log", { name: t("round.myFeed") })).queryAllByRole("listitem")
          .length,
      );
      expect(others()).toHaveLength(9);
    }
    // A rodada terminou: a tela de resultados apareceu.
    expect(screen.getByRole("region", { name: t("home.lastRound", { round: 1 }) })).toBeDefined();
    // Nenhuma atualização é lenta (folga grande sobre o tempo medido, por causa do ambiente de teste).
    const average = times.reduce((sum, value) => sum + value, 0) / times.length;
    expect(average).toBeLessThan(100);
    expect(Math.max(...times)).toBeLessThan(1000);
    // A lista de lances nunca passa do teto.
    expect(timeline).toBeLessThanOrEqual(TIMELINE_LIMIT);
    expect(timeline).toBeGreaterThan(0);
  });
});
