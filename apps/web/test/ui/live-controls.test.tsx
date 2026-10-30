// 030 US3: barra de controle e saída com confirmação num diálogo, por todos os caminhos.
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { elapse, useRoundClock } from "../helpers/live";
import { memoryRouter } from "../helpers/router";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    "brasfoot-like:preferences",
    JSON.stringify({ autoPause: false, roundMode: "live" }),
  );
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

describe("barra de controle (030)", () => {
  it("tem sair, velocidade, pausar, terminar agora e pausa automática, com o estado escrito", async () => {
    const { user } = await startLive();
    const bar = screen.getByRole("group", { name: t("round.controls") });
    expect(within(bar).getByRole("button", { name: t("round.leave") })).toBeDefined();
    expect(within(bar).getByLabelText(t("round.speed"))).toBeDefined();
    expect(within(bar).getByRole("button", { name: t("round.finishNow") })).toBeDefined();
    expect(within(bar).getByLabelText(t("round.autoPause"))).toBeDefined();
    expect(within(bar).getByText(t("round.state.running"))).toBeDefined();
    await user.click(within(bar).getByRole("button", { name: t("round.pause") }));
    expect(within(bar).getByText(t("round.state.paused"))).toBeDefined();
    expect(within(bar).getByRole("button", { name: t("round.resume") })).toBeDefined();
  });

  it("a velocidade tem três opções e a escolhida fica à mostra", async () => {
    const { user } = await startLive();
    const speed = screen.getByLabelText(t("round.speed")) as HTMLSelectElement;
    expect([...speed.options].map((option) => option.textContent)).toEqual([
      t("round.speed.slow"),
      t("round.speed.normal"),
      t("round.speed.fast"),
    ]);
    await user.selectOptions(speed, "fast");
    expect(speed.value).toBe("fast");
    await elapse(3_000);
    expect(speed.value).toBe("fast");
  });
});

describe("saída com confirmação (030)", () => {
  it("Sair abre o diálogo com o foco em Continuar; Esc cancela, o foco volta ao Sair e a rodada segue", async () => {
    const { user } = await startLive();
    const leave = screen.getByRole("button", { name: t("round.leave") });
    await user.click(leave);
    const dialog = await screen.findByRole("dialog", { name: t("round.leaveTitle") });
    expect(document.activeElement).toBe(
      within(dialog).getByRole("button", { name: t("round.leaveStay") }),
    );
    // Enquanto o diálogo está aberto, a rodada fica parada.
    expect(screen.getByText(t("round.state.paused"))).toBeDefined();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(leave);
    expect(memoryRouter.pathname()).toBe("/jogo/rodada");
    expect(screen.getByText(t("round.state.running"))).toBeDefined();
  });

  it("confirmar vai à Início", async () => {
    const { user } = await startLive();
    await user.click(screen.getByRole("button", { name: t("round.leave") }));
    const dialog = await screen.findByRole("dialog", { name: t("round.leaveTitle") });
    await user.click(within(dialog).getByRole("button", { name: t("round.leaveConfirm") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
  });

  it("o link Voltar da moldura de foco passa pelo mesmo diálogo", async () => {
    const { user } = await startLive();
    await user.click(screen.getByRole("link", { name: t("nav.home") }));
    expect(await screen.findByRole("dialog", { name: t("round.leaveTitle") })).toBeDefined();
    expect(memoryRouter.pathname()).toBe("/jogo/rodada");
  });

  it("um atalho de outra tela também pergunta antes de sair", async () => {
    const { user } = await startLive();
    await user.keyboard("2");
    expect(await screen.findByRole("dialog", { name: t("round.leaveTitle") })).toBeDefined();
    expect(memoryRouter.pathname()).toBe("/jogo/rodada");
  });

  it("depois de terminar a rodada, sair não pergunta", async () => {
    const { user } = await startLive();
    await user.click(screen.getByRole("button", { name: t("round.finishNow") }));
    await screen.findByRole("region", { name: t("home.lastRound", { round: 1 }) });
    await user.keyboard("1");
    expect(screen.queryByRole("dialog", { name: t("round.leaveTitle") })).toBeNull();
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
  });
});
