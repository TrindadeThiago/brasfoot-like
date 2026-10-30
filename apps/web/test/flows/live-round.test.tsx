import { advanceLeague } from "@brasfoot-like/engine";
import { userSeason } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shouldAutoPause } from "../../src/game/useLiveRound";
import { t } from "../../src/i18n";
import { writePreferences } from "../../src/storage/preferences";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { elapse, loadSaved, useRoundClock } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

beforeEach(() => {
  localStorage.clear();
  useRoundClock();
});
afterEach(() => vi.useRealTimers());

async function startLive() {
  const career = await storedCareer(1);
  renderApp("/jogo?c=tela", career.store);
  const user = userEvent.setup({ delay: null });
  await user.click(await screen.findByRole("button", { name: t("home.playLive") }));
  await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/rodada"));
  await screen.findByRole("region", { name: t("round.myMatch") });
  return { ...career, user };
}

const results = () => screen.queryByRole("region", { name: t("home.lastRound", { round: 1 }) });

function direct(save: Awaited<ReturnType<typeof storedCareer>>["save"]) {
  const result = advanceLeague(
    save.league,
    save.bank,
    { rounds: 1 },
    { [save.clubId]: save.lineup },
  );
  if (!result.ok) throw new Error("falhou");
  return userSeason({ ...save, league: result.league }).records;
}

describe("rodada ao vivo (US1, US3)", () => {
  it("10 jogos com relógio; feed; termina entre 30 e 60 s; salva igual ao direto (SC-002, SC-004)", async () => {
    const { store, save } = await startLive();
    const mine = screen.getByRole("region", { name: t("round.myMatch") });
    expect(within(mine).getByText("0'")).toBeDefined();
    expect(
      within(screen.getByRole("region", { name: t("round.otherMatches") })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(9);

    // Estatísticas do jogo do clube visíveis desde o início, com a posse dos dois times.
    const stats = screen.getByRole("table", { name: t("summary.stats") });
    expect(within(stats).getByText(t("summary.stat.possession"))).toBeDefined();

    await elapse(10_000);
    expect(within(mine).queryByText("0'")).toBeNull();

    await elapse(29_000);
    expect(results()).toBeNull();
    // Lances do meu jogo até aqui: todo gol (até os 80') aparece com o autor.
    const records = direct(save);
    const record = records.find(
      (entry) => entry.home === save.clubId || entry.away === save.clubId,
    );
    const feed = screen.getByRole("log", { name: t("round.myFeed") }).textContent ?? "";
    for (const event of record?.events ?? []) {
      if (event.type === "shot" && event.outcome === "goal" && event.minute <= 80) {
        const name = save.bank.players.find((player) => player.id === event.playerId)?.displayName;
        expect(feed).toContain(name);
      }
    }

    await elapse(21_000);
    expect(results()).not.toBeNull();
    await waitFor(async () => expect(userSeason(await loadSaved(store)).nextRound).toBe(2));
    const saved = await loadSaved(store);
    expect(userSeason(saved).records).toEqual(records);
    expect(screen.getByRole("article", { name: /^Resumo:/ })).toBeDefined();
  });

  it("na velocidade rápida termina em torno de 30 s", async () => {
    const { user } = await startLive();
    await user.selectOptions(screen.getByLabelText(t("round.speed")), "fast");
    await elapse(24_000);
    expect(results()).toBeNull();
    await elapse(12_000);
    expect(results()).not.toBeNull();
  });

  it("terminar agora dá o mesmo resultado do direto", async () => {
    const { store, save, user } = await startLive();
    await elapse(12_000);
    await user.click(screen.getByRole("button", { name: t("round.finishNow") }));
    expect(results()).not.toBeNull();
    await waitFor(async () => expect(userSeason(await loadSaved(store)).nextRound).toBe(2));
    expect(userSeason(await loadSaved(store)).records).toEqual(direct(save));
  });

  it("D simula direto e o modo preferido é lembrado", async () => {
    const { store } = await storedCareer(1);
    const view = renderApp("/jogo?c=tela", store);
    await screen.findByRole("button", { name: t("home.playLive") });
    const user = userEvent.setup({ delay: null });
    await user.keyboard("d");
    await waitFor(async () => expect(userSeason(await loadSaved(store)).nextRound).toBe(2));
    view.unmount();
    renderApp("/jogo?c=tela", store);
    await screen.findByRole("button", { name: t("home.playLive") });
    await user.keyboard("s");
    await waitFor(async () => expect(userSeason(await loadSaved(store)).nextRound).toBe(3));
    expect(memoryRouter.pathname()).toBe("/jogo");
  });

  it("sair no meio pede confirmação num diálogo; continuar mantém a rodada e sair vai à Início", async () => {
    const { user } = await startLive();
    await user.keyboard("1");
    const dialog = await screen.findByRole("dialog", { name: t("round.leaveTitle") });
    expect(within(dialog).getByText(t("round.confirmLeave"))).toBeDefined();
    expect(memoryRouter.pathname()).toBe("/jogo/rodada");
    await user.click(within(dialog).getByRole("button", { name: t("round.leaveStay") }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(memoryRouter.pathname()).toBe("/jogo/rodada");
    await user.keyboard("1");
    const again = await screen.findByRole("dialog", { name: t("round.leaveTitle") });
    await user.click(within(again).getByRole("button", { name: t("round.leaveConfirm") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
    writePreferences({});
  });
});

describe("pausa automática (FR-010)", () => {
  it("só para lesão ou expulsão do próprio time", () => {
    const base = { seq: 1, half: 1 as const, minute: 10, stoppage: 0 };
    expect(
      shouldAutoPause(
        [{ ...base, type: "injury", side: "home", playerId: "p", severity: "minor" }],
        "home",
      ),
    ).toBe(true);
    expect(
      shouldAutoPause(
        [{ ...base, type: "red_card", side: "home", playerId: "p", reason: "direct" }],
        "away",
      ),
    ).toBe(false);
    expect(
      shouldAutoPause([{ ...base, type: "yellow_card", side: "home", playerId: "p" }], "home"),
    ).toBe(false);
  });
});
