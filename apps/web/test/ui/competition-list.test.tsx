// 027 US1: abas Minhas/Demais, cartões de competição e situação do clube.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { CompetitionList } from "../../src/ui/CompetitionList";
import { memoryRouter } from "../helpers/router";
import { continentalSave, twoCompetitionsSave } from "../helpers/saves";

beforeEach(() => memoryRouter.reset("/jogo/competicao"));

describe("lista de competições (027)", () => {
  it("duas abas, Minhas é a padrão, e o cartão da competição principal mostra a situação", () => {
    const save = twoCompetitionsSave("tela");
    render(<CompetitionList save={save} competitionId={save.league.competitionId} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      t("competition.mine"),
      t("competition.others"),
    ]);
    expect(
      screen.getByRole("tab", { name: t("competition.mine") }).getAttribute("aria-selected"),
    ).toBe("true");
    const current = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("aria-current") === "page");
    expect(current).toBeDefined();
    expect(
      within((current as HTMLElement).parentElement as HTMLElement).getAllByText(/Começa em/)
        .length,
    ).toBeGreaterThan(0);
  });

  it("Demais competições lista as outras, com a contagem", async () => {
    const save = twoCompetitionsSave("tela");
    render(<CompetitionList save={save} competitionId={save.league.competitionId} />);
    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole("tab", { name: t("competition.others") }));
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText(/^\d+ competiç/)).toBeDefined();
  });

  it("competição entre países aparece com 'Entre países' em Minhas quando o clube participa", () => {
    const save = continentalSave("tela", true);
    render(<CompetitionList save={save} competitionId={save.league.competitionId} />);
    expect(
      screen.getAllByText(new RegExp(t("competition.card.international"))).length,
    ).toBeGreaterThan(0);
  });
});
