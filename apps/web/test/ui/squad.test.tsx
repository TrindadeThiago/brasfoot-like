import { ageOn } from "@brasfoot-like/engine";
import { userSeason } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { label, t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer, withUserSeason } from "../helpers/career";

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
      t("col.inLineup"),
      t("col.evolution"),
      t("col.contractUntil"),
      t("col.actions"),
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
        ...userSeason(career).status,
        [squad[0]?.id ?? ""]: { yellows: 0, suspension: 1, injury: 0 },
        [squad[1]?.id ?? ""]: { yellows: 0, suspension: 0, injury: 3 },
      };
      return withUserSeason(career, (season) => ({ ...season, status }));
    });
    renderApp("/jogo/elenco?c=tela", store);
    expect(await screen.findByText(t("squad.suspended", { matches: 1 }))).toBeDefined();
    expect(screen.getByText(t("squad.injured", { matches: 3 }))).toBeDefined();
    expect(save).toBeDefined();
  });

  it("filtra por setor e condição, mantendo a ordenação e salvando os filtros (US4)", async () => {
    const { store, save } = await storedCareer(1, (career) => {
      const forwards = career.bank.players.filter(
        (player) => player.clubId === career.clubId && player.position === "FW",
      );
      const status = {
        ...userSeason(career).status,
        [forwards[0]?.id ?? ""]: { yellows: 0, suspension: 0, injury: 2 },
      };
      return withUserSeason(career, (season) => ({ ...season, status }));
    });
    const view = renderApp("/jogo/elenco?c=tela", store);
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: new RegExp(t("col.strength")) }));
    await user.click(screen.getByRole("button", { name: new RegExp(t("col.strength")) }));
    await user.selectOptions(screen.getByLabelText(t("squad.filterSector")), "ATT");
    await user.selectOptions(screen.getByLabelText(t("squad.filterAvailability")), "available");
    const forwards = save.bank.players.filter(
      (player) => player.clubId === save.clubId && player.position === "FW",
    );
    const rows = () =>
      within(
        within(screen.getByRole("table")).getAllByRole("rowgroup")[1] as HTMLElement,
      ).getAllByRole("row");
    expect(rows()).toHaveLength(forwards.length - 1);
    for (const row of rows()) {
      expect(within(row).getAllByRole("cell")[0]?.textContent).toBe(label("position.FW"));
      expect(within(row).getAllByRole("cell")[5]?.textContent).toBe(t("squad.available"));
    }
    const values = rows().map((row) => Number(within(row).getAllByRole("cell")[3]?.textContent));
    expect(values).toEqual([...values].sort((a, b) => b - a));
    await user.selectOptions(screen.getByLabelText(t("squad.filterAvailability")), "unavailable");
    expect(rows()).toHaveLength(1);
    view.unmount();
    renderApp("/jogo/elenco?c=tela", store);
    await screen.findByRole("table");
    expect((screen.getByLabelText(t("squad.filterSector")) as HTMLSelectElement).value).toBe("ATT");
    await user.click(screen.getByRole("button", { name: t("squad.clearFilters") }));
    const all = save.bank.players.filter((player) => player.clubId === save.clubId);
    expect(rows()).toHaveLength(all.length);
  });

  it("mostra a situação de cada jogador na escalação", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/elenco?c=tela", store);
    const table = await screen.findByRole("table");
    const cellOf = (playerId: string) => {
      const name = save.bank.players.find((player) => player.id === playerId)?.displayName ?? "";
      const row = within(table).getByText(name).closest("tr") as HTMLElement;
      return within(row).getAllByRole("cell")[6]?.textContent;
    };
    expect(cellOf(save.lineup.starters.gk as string)).toBe(
      t("squad.inLineup.starter", { position: label("position.GK") }),
    );
    expect(cellOf(save.lineup.bench[0] as string)).toBe(t("squad.inLineup.bench"));
    const used = new Set([...Object.values(save.lineup.starters), ...save.lineup.bench]);
    const out = save.bank.players.find(
      (player) => player.clubId === save.clubId && !used.has(player.id),
    );
    if (out) expect(cellOf(out.id)).toBe(t("squad.inLineup.out"));
  });
});
