import { userSeason } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";

describe("Início do clube (FR-016)", () => {
  it("mostra próximo jogo, posição e últimos resultados", async () => {
    const { store, save } = await storedCareer(6);
    renderApp("/jogo?c=tela", store);
    const next = await screen.findByRole("region", { name: t("home.nextMatch") });
    const fixture = userSeason(save).calendar[5]?.fixtures.find(
      (entry) => entry.home === save.clubId || entry.away === save.clubId,
    );
    const opponentId = fixture?.home === save.clubId ? fixture?.away : fixture?.home;
    const opponent = save.bank.clubs.find((club) => club.id === opponentId);
    expect(within(next).getByRole("img", { name: opponent?.name ?? "" })).toBeDefined();
    expect(
      within(next).getByText(
        fixture?.home === save.clubId ? t("home.homeGame") : t("home.awayGame"),
      ),
    ).toBeDefined();
    expect(within(next).getByText(t("home.roundLabel", { round: 6 }))).toBeDefined();
    const position = screen.getByRole("region", { name: t("home.position") });
    expect(within(position).getByText(/º lugar/)).toBeDefined();
    const last = screen.getByRole("region", { name: t("home.lastResults") });
    expect(within(last).getAllByRole("listitem")).toHaveLength(5);
  });

  it("antes do primeiro jogo, avisa que não há resultados", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=tela", store);
    expect(await screen.findByText(t("home.noResults"))).toBeDefined();
  });

  it("mostra 'Simulando…' e trava os botões enquanto a rodada direta é calculada (016 FR-029)", async () => {
    // Segura o próximo quadro para observar o estado antes do cálculo.
    let paint: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      paint = callback;
      return 1;
    });
    try {
      const { store } = await storedCareer(1);
      renderApp("/jogo?c=tela", store);
      const simulate = await screen.findByRole("button", { name: t("home.simulate") });
      await userEvent.setup().click(simulate);
      await waitFor(() => expect(paint).toBeDefined());
      expect(screen.getByText(t("home.simulating")).getAttribute("role")).toBe("status");
      expect((simulate as HTMLButtonElement).disabled).toBe(true);
      paint?.(0);
      expect(
        await screen.findByRole("region", { name: t("home.lastRound", { round: 1 }) }),
      ).toBeDefined();
      expect(screen.queryByText(t("home.simulating"))).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
