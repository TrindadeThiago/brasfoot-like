// 030 R7, FR-024: anúncios para leitor de tela só do meu jogo, todos os do lote e em ordem.
import { advanceLeague } from "@brasfoot-like/engine";
import { userSeason } from "@brasfoot-like/save";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { elapse, useRoundClock } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 120000 });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    "brasfoot-like:preferences",
    JSON.stringify({ autoPause: false, roundMode: "live", roundSpeed: "fast" }),
  );
  useRoundClock();
});
afterEach(() => vi.useRealTimers());

/** A região de anúncios (`log` escondido e ao vivo): a do cronograma tem `aria-live="off"`. */
const announcements = () =>
  [...document.querySelectorAll("[role='log'][aria-relevant]")]
    .map((node) => node.textContent ?? "")
    .join(" ");

describe("anúncios da rodada ao vivo (030)", () => {
  it("anuncia os gols do meu jogo e nenhum lance de outro jogo", async () => {
    const { store, save } = await storedCareer(1);
    const result = advanceLeague(
      save.league,
      save.bank,
      { rounds: 1 },
      { [save.clubId]: save.lineup },
    );
    if (!result.ok) throw new Error("falhou");
    const records = userSeason({ ...save, league: result.league }).records;
    const mine = records.find(
      (record) => record.home === save.clubId || record.away === save.clubId,
    );
    const others = records.filter((record) => record !== mine);
    const players = new Map(save.bank.players.map((player) => [player.id, player]));
    const nameOf = (id: string) => players.get(id)?.displayName ?? "";

    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole("button", { name: t("home.playLive") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/rodada"));
    await screen.findByRole("region", { name: t("round.myMatch") });

    let last = "";
    for (let step = 0; step < 40; step++) {
      await elapse(1_000);
      if (!screen.queryByRole("region", { name: t("round.myMatch") })) break;
      last = announcements() || last;
    }
    expect(last).not.toBe("");
    // Os gols do meu jogo que já passaram (até os 60') foram anunciados com o autor.
    for (const event of mine?.events ?? []) {
      if (event.type === "shot" && event.outcome === "goal" && event.minute <= 60) {
        expect(last).toContain(nameOf(event.playerId));
      }
    }
    // Nenhum lance de outro jogo é anunciado: nenhum jogador dos outros clubes aparece.
    for (const record of others) {
      for (const event of record.events) {
        if (event.type === "shot" && event.outcome === "goal") {
          expect(last).not.toContain(nameOf(event.playerId));
        }
      }
    }
  });
});
