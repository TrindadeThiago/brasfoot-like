import type { SaveFile } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";

/** O clube do jogador passa a ter exatamente `size` jogadores (duplica os que tem). */
function withSquadOf(size: number) {
  return (save: SaveFile): SaveFile => {
    const own = save.bank.players.filter((player) => player.clubId === save.clubId);
    const extra = Array.from({ length: Math.max(0, size - own.length) }, (_, index) => ({
      ...(own[index % own.length] as (typeof own)[number]),
      id: `extra-${index}`,
    }));
    return { ...save, bank: { ...save.bank, players: [...save.bank.players, ...extra] } };
  };
}

describe("contador do elenco", () => {
  it("o Elenco mostra quantos jogadores há e o máximo de 40", async () => {
    const { store } = await storedCareer(1, withSquadOf(30));
    renderApp("/jogo/elenco?c=tela", store);
    await screen.findByRole("table");
    expect(screen.getByText(t("squad.count", { count: 30, max: 40 }))).toBeDefined();
    expect(screen.getByText("Elenco: 30/40 jogadores")).toBeDefined();
  });

  it("o Mercado mostra o mesmo contador", async () => {
    const { store } = await storedCareer(1, withSquadOf(33));
    renderApp("/jogo/mercado?c=tela", store);
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    expect(screen.getByText("Elenco: 33/40 jogadores")).toBeDefined();
  });

  it("no limite o contador segue visível", async () => {
    const { store } = await storedCareer(1, withSquadOf(40));
    renderApp("/jogo/elenco?c=tela", store);
    const table = await screen.findByRole("table");
    expect(screen.getByText("Elenco: 40/40 jogadores")).toBeDefined();
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(40);
  });
});
