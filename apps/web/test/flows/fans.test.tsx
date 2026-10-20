import { rivalsOf } from "@brasfoot-like/engine";
import { userSeason } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";

vi.setConfig({ testTimeout: 60000 });

describe("torcida e clássicos no app (013)", () => {
  it("Início mostra o cartão Torcida com faixa, valor e motivos", async () => {
    const { store, save } = await storedCareer(4);
    const club = save.fans.clubs[save.clubId];
    if (!club) throw new Error("sem torcida");
    expect(club.recent).toHaveLength(3);
    renderApp("/jogo?c=tela", store);
    const card = await screen.findByRole("region", { name: t("fans.title") });
    expect(within(card).getByText(String(club.mood))).toBeDefined();
    expect(within(card).getByText(t("fans.reasons"))).toBeDefined();
  });

  it("o calendário marca os clássicos do clube", async () => {
    const { store, save } = await storedCareer(1);
    const rivals = new Set(rivalsOf(save.bank, save.clubId).map((rival) => rival.clubId));
    const derbies = userSeason(save).calendar.filter((round) =>
      round.fixtures.some(
        (fixture) =>
          (fixture.home === save.clubId && rivals.has(fixture.away)) ||
          (fixture.away === save.clubId && rivals.has(fixture.home)),
      ),
    );
    renderApp("/jogo/calendario?c=tela", store);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getAllByRole("img", { name: /^Clássico/ }).length).toBeGreaterThanOrEqual(
      derbies.length,
    );
  });

  it("Carreira › Torcida lista os rivais", async () => {
    const user = userEvent.setup();
    const { store, save } = await storedCareer(1);
    const rivals = rivalsOf(save.bank, save.clubId);
    renderApp("/jogo/carreira?c=tela", store);
    await user.click(await screen.findByRole("tab", { name: t("career.tab.fans") }));
    const table = screen.getByRole("table", { name: t("fans.rivals.title") });
    for (const rival of rivals) {
      const name = save.bank.clubs.find((club) => club.id === rival.clubId)?.name ?? "";
      expect(within(table).getAllByText(name).length).toBeGreaterThan(0);
    }
  });
});
