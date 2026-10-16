import { ageOn } from "@brasfoot-like/engine";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { label, t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";

describe("Elenco (FR-017)", () => {
  it("lista os jogadores do clube com as colunas visíveis e sem atributos ocultos", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/elenco?c=tela", store);
    const squad = save.bank.players.filter((player) => player.clubId === save.clubId);
    const table = await screen.findByRole("table");
    const rows = within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole(
      "row",
    );
    expect(rows).toHaveLength(squad.length);
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/[▲▼]/g, "").trim());
    expect(headers).toEqual([
      t("col.playerPosition"),
      t("col.player"),
      t("col.age"),
      t("col.strength"),
      t("col.traits"),
      t("col.status"),
    ]);
    const player = squad[0];
    if (!player) throw new Error("sem jogador");
    const row = rows.find((candidate) => within(candidate).queryByText(player.displayName));
    expect(row).toBeDefined();
    const cells = within(row as HTMLElement)
      .getAllByRole("cell")
      .map((cell) => cell.textContent);
    expect(cells[0]).toBe(label(`position.${player.position}`));
    expect(cells[2]).toBe(String(ageOn(player.birthDate, save.bank.manifest.referenceDate)));
    expect(cells[3]).toBe(String(player.strength));
    expect(document.body.textContent).not.toMatch(/potencial|temperamento|propensão/i);
  });

  it("ordena por força", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/elenco?c=tela", store);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: new RegExp(t("col.strength")) }));
    await user.click(screen.getByRole("button", { name: new RegExp(t("col.strength")) }));
    const table = screen.getByRole("table");
    const values = within(within(table).getAllByRole("rowgroup")[1] as HTMLElement)
      .getAllByRole("row")
      .map((row) => Number(within(row).getAllByRole("cell")[3]?.textContent));
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });

  it("marca suspensos e lesionados", async () => {
    const { store, save } = await storedCareer(1, (career) => {
      const squad = career.bank.players.filter((player) => player.clubId === career.clubId);
      const status = {
        ...career.season.status,
        [squad[0]?.id ?? ""]: { yellows: 0, suspension: 1, injury: 0 },
        [squad[1]?.id ?? ""]: { yellows: 0, suspension: 0, injury: 3 },
      };
      return { ...career, season: { ...career.season, status } };
    });
    renderApp("/jogo/elenco?c=tela", store);
    expect(await screen.findByText(t("squad.suspended", { matches: 1 }))).toBeDefined();
    expect(screen.getByText(t("squad.injured", { matches: 3 }))).toBeDefined();
    expect(save).toBeDefined();
  });
});
