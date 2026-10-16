import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";

describe("Competição (FR-018)", () => {
  it("mostra a tabela completa com o clube do jogador destacado", async () => {
    const { store, save } = await storedCareer(4);
    renderApp("/jogo/competicao?c=tela", store);
    const table = await screen.findByRole("table", { name: t("competition.caption") });
    const rows = within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole(
      "row",
    );
    expect(rows).toHaveLength(20);
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/[▲▼]/g, "").trim());
    for (const key of [
      "col.position",
      "col.club",
      "col.points",
      "col.played",
      "col.wins",
      "col.draws",
      "col.losses",
      "col.goalsFor",
      "col.goalsAgainst",
      "col.goalDifference",
      "col.form",
    ]) {
      expect(headers).toContain(t(key));
    }
    const highlighted = rows.filter((row) => row.getAttribute("aria-current") === "true");
    expect(highlighted).toHaveLength(1);
    const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
    expect(
      within(highlighted[0] as HTMLElement).getByRole("img", { name: club?.name ?? "" }),
    ).toBeDefined();
  });
});

describe("Calendário (FR-019)", () => {
  it("mostra as 38 rodadas, placares disputados e a próxima rodada destacada", async () => {
    const { store, save } = await storedCareer(4);
    renderApp("/jogo/calendario?c=tela", store);
    const table = await screen.findByRole("table");
    const rows = within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole(
      "row",
    );
    expect(rows).toHaveLength(38);
    const firstRecord = save.season.records.find(
      (record) =>
        record.round === 1 && (record.home === save.clubId || record.away === save.clubId),
    );
    expect(
      within(rows[0] as HTMLElement).getByText(
        `${firstRecord?.score.home} × ${firstRecord?.score.away}`,
      ),
    ).toBeDefined();
    expect(rows[3]?.getAttribute("aria-current")).toBe("true");
    expect(within(rows[10] as HTMLElement).getByText(t("calendar.notPlayed"))).toBeDefined();
  });

  it("mostra todos os jogos de uma rodada", async () => {
    const { store } = await storedCareer(4);
    renderApp("/jogo/calendario?c=tela", store);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: t("calendar.showRound", { round: 2 }) }),
    );
    const region = screen.getByRole("region", { name: t("calendar.roundMatches", { round: 2 }) });
    expect(within(region).getAllByRole("listitem")).toHaveLength(10);
  });
});
