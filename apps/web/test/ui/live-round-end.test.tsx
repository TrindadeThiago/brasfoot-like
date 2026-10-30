// 030 US5: fim da rodada ao vivo: resultados, resumo do meu jogo e a próxima ação.
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { useRoundClock } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 180000 });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    "brasfoot-like:preferences",
    JSON.stringify({ autoPause: false, roundMode: "live" }),
  );
  useRoundClock();
});
afterEach(() => vi.useRealTimers());

async function finishRound(round: number) {
  const career = await storedCareer(round);
  renderApp("/jogo?c=tela", career.store);
  const user = userEvent.setup({ delay: null });
  await user.click(await screen.findByRole("button", { name: t("home.playLive") }));
  await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/rodada"));
  await screen.findByRole("region", { name: t("round.myMatch") });
  await user.click(screen.getByRole("button", { name: t("round.finishNow") }));
  const results = await screen.findByRole("region", { name: t("home.lastRound", { round }) });
  return { ...career, user, results };
}

describe("fim da rodada (030)", () => {
  it("mostra os resultados, o resumo do meu jogo e Ver classificação e Voltar ao início", async () => {
    const { results } = await finishRound(1);
    expect(within(results).getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(screen.getByRole("article", { name: /^Resumo:/ })).toBeDefined();
    expect(screen.getByRole("link", { name: t("round.toStandings") })).toBeDefined();
    expect(screen.getByRole("link", { name: t("round.toHome") })).toBeDefined();
    expect(screen.queryByRole("link", { name: t("round.toSeasonEnd") })).toBeNull();
    // O meu jogo fica marcado nos resultados.
    expect(results.querySelector("[aria-current='true']")).not.toBeNull();
  });

  it("Ver classificação leva à classificação da divisão", async () => {
    const { user } = await finishRound(1);
    await user.click(screen.getByRole("link", { name: t("round.toStandings") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/competicao"));
  });

  it("na última rodada da temporada a ação é Ver o resumo da temporada", async () => {
    await finishRound(38);
    const toSeasonEnd = await screen.findByRole("link", { name: t("round.toSeasonEnd") });
    expect(screen.queryByRole("link", { name: t("round.toHome") })).toBeNull();
    expect(toSeasonEnd.getAttribute("href")).toContain("/jogo/fim-de-temporada");
  });
});
