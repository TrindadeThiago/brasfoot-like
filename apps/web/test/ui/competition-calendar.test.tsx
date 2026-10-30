import { userSeason } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { monthGrid, seasonLines, showRoundButton } from "../helpers/calendar";
import { storedCareer } from "../helpers/career";

describe("Competição (FR-018)", () => {
  it("mostra a tabela completa com o clube do jogador destacado", async () => {
    const { store, save } = await storedCareer(4);
    renderApp("/jogo/competicao?c=tela", store);
    const table = await screen.findByRole("table", {
      name: t("competition.caption", { division: "Série A" }),
    });
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
    await monthGrid();
    const lines = await seasonLines(userEvent.setup({ delay: null }));
    expect(lines).toHaveLength(38);
    const firstRecord = userSeason(save).records.find(
      (record) =>
        record.round === 1 && (record.home === save.clubId || record.away === save.clubId),
    );
    expect(lines[0]?.text).toContain(`${firstRecord?.score.home} × ${firstRecord?.score.away}`);
    expect(lines[3]?.current).toBe(true);
    expect(lines[10]?.text).toContain(t("calendar.notPlayed"));
  });

  it("mostra todos os jogos de uma rodada num diálogo", async () => {
    const { store } = await storedCareer(4);
    renderApp("/jogo/calendario?c=tela", store);
    const user = userEvent.setup();
    await monthGrid();
    await user.click(await showRoundButton(user, 2));
    const dialog = screen.getByRole("dialog", { name: t("calendar.roundMatches", { round: 2 }) });
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(10);
  });

  describe("fechar a lista da rodada", () => {
    async function openRound() {
      const { store } = await storedCareer(4);
      renderApp("/jogo/calendario?c=tela", store);
      const user = userEvent.setup();
      await monthGrid();
      await user.click(await showRoundButton(user, 2));
      await screen.findByRole("dialog");
      return user;
    }

    it("pelo botão Fechar", async () => {
      const user = await openRound();
      await user.click(screen.getByRole("button", { name: t("common.close") }));
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("pelo Esc", async () => {
      const user = await openRound();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("clicando fora do diálogo", async () => {
      const user = await openRound();
      const dialog = screen.getByRole("dialog");
      await user.click(dialog.parentElement as HTMLElement);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("clicar dentro do diálogo não fecha", async () => {
      const user = await openRound();
      await user.click(screen.getByRole("dialog"));
      expect(screen.getByRole("dialog")).toBeDefined();
    });

    it("o Resumo de um jogo da rodada abre e Voltar retorna à lista", async () => {
      const user = await openRound();
      const [summary] = within(screen.getByRole("dialog")).getAllByRole("button", {
        name: /^Ver resumo de /,
      });
      if (!summary) throw new Error("rodada 2 sem jogo disputado");
      await user.click(summary);
      const dialog = await screen.findByRole("dialog", { name: /^Ver resumo de / });
      expect(within(dialog).getByRole("article")).toBeDefined();
      await user.click(
        within(dialog).getByRole("button", { name: t("calendar.backToRound", { round: 2 }) }),
      );
      expect(
        await screen.findByRole("dialog", { name: t("calendar.roundMatches", { round: 2 }) }),
      ).toBeDefined();
    });
  });
});
