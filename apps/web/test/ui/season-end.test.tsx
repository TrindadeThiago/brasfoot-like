// 030 US6: o fim de temporada com hierarquia: título com o botão, resultado, campanha, campeões, acesso e rebaixamento.
import type { SaveFile } from "@brasfoot-like/save";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { campaign } from "../../src/game/season-view";
import { seasonEndSummary } from "../../src/game/selectors";
import { t } from "../../src/i18n";
import { SeasonHeader } from "../../src/ui/season/SeasonHeader";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";
import { finishedSeason } from "../helpers/season-end";

vi.setConfig({ testTimeout: 60000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/fim-de-temporada?c=tela");
});

async function open(edit?: (save: SaveFile) => SaveFile) {
  const career = await storedCareer(1, (save) => {
    const ended = finishedSeason(save);
    return edit ? edit(ended) : ended;
  });
  renderApp("/jogo/fim-de-temporada?c=tela", career.store);
  await screen.findByRole("heading", {
    name: new RegExp(`^${t("seasonEnd.title", { year: career.save.league.year })}$`),
  });
  return career;
}

describe("cabeçalho da temporada (030)", () => {
  it("o título e o botão Próxima temporada ficam na mesma linha", async () => {
    const { save } = await open();
    const title = screen.getByRole("heading", {
      name: t("seasonEnd.title", { year: save.league.year }),
    });
    const row = title.parentElement as HTMLElement;
    expect(within(row).getByRole("button", { name: t("seasonEnd.next") })).toBeDefined();
  });

  it("preparando desativa o botão e a falha aparece logo abaixo, com o botão de volta", () => {
    const { rerender } = render(<SeasonHeader year={2027} state="busy" onNext={() => {}} />);
    const busy = screen.getByRole("button", {
      name: t("seasonEnd.preparing"),
    }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    rerender(<SeasonHeader year={2027} state="failed" onNext={() => {}} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe(t("seasonEnd.failed"));
    const next = screen.getByRole("button", { name: t("seasonEnd.next") }) as HTMLButtonElement;
    expect(next.disabled).toBe(false);
    // O aviso vem depois da linha do título.
    const title = screen.getByRole("heading");
    expect(title.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("resultado do clube (030)", () => {
  it("destaca a situação em texto e traz posição, pontos, jogos, gols e saldo", async () => {
    const { save } = await open();
    const summary = seasonEndSummary(save);
    const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
    const card = screen.getByRole("region", { name: t("seasonEnd.result") });
    expect(
      within(card).getByText(t(`seasonEnd.situation.${summary.mine.situation}`)),
    ).toBeDefined();
    expect(within(card).getByText(new RegExp(`${club?.name ?? ""}`))).toBeDefined();
    for (const key of [
      "col.position",
      "col.points",
      "col.wins",
      "col.draws",
      "col.losses",
      "col.goalsFor",
      "col.goalsAgainst",
      "col.goalDifference",
    ]) {
      expect(within(card).getByText(t(key))).toBeDefined();
    }
  });
});

describe("como foi a sua temporada (030)", () => {
  it("traz a campanha por competição com a premiação e o total, e a avaliação da diretoria", async () => {
    const { save } = await open();
    const section = screen.getByRole("region", { name: t("seasonEnd.campaign") });
    const { rows, total } = campaign(save);
    const table = within(section).getByRole("table", { name: t("seasonEnd.campaign.table") });
    expect(within(table).getAllByRole("row").length).toBe(rows.length + 1);
    const league = rows.find((row) => row.kind === "league");
    expect(
      within(table).getByText(t("seasonEnd.campaign.pending"), { exact: false }),
    ).toBeDefined();
    expect(within(section).getByText(/^Total de premiação: /)).toBeDefined();
    expect(total).toBe(rows.reduce((sum, row) => sum + row.prize, 0));
    expect(league?.prize).toBe(seasonEndSummary(save).mine.prize);
    expect(
      within(section).getByText(t("board.evaluation.title", { year: save.league.year })),
    ).toBeDefined();
  });

  it("sem avaliação da diretoria, só a campanha", async () => {
    await open((save) => {
      const { evaluation: _removed, ...board } = save.board;
      return { ...save, board };
    });
    const section = screen.getByRole("region", { name: t("seasonEnd.campaign") });
    expect(within(section).queryByText(/Avaliação/)).toBeNull();
  });
});

describe("campeões, acesso e rebaixamento e a classificação (030)", () => {
  it("campeões das ligas nacionais com a divisão do clube destacada em texto", async () => {
    const { save } = await open();
    const section = screen.getByRole("region", { name: t("seasonEnd.champions") });
    const summary = seasonEndSummary(save);
    expect(within(section).getAllByRole("region").length).toBe(summary.champions.length);
    const own = within(section)
      .getAllByRole("region")
      .find((entry) => entry.getAttribute("aria-current") === "true");
    expect(own).toBeDefined();
    expect(within(own as HTMLElement).getByText(t("seasonEnd.yourDivision"))).toBeDefined();
  });

  it("acesso e rebaixamento por fronteira, com o clube do jogador destacado", async () => {
    const { save } = await open();
    const summary = seasonEndSummary(save);
    if (summary.moves.length === 0) return;
    const section = screen.getByRole("region", { name: t("seasonEnd.moves") });
    expect(within(section).getAllByRole("region").length).toBe(summary.moves.length);
  });

  it("a classificação final da divisão vem recolhida e só monta a tabela ao abrir", async () => {
    await open();
    const details = screen
      .getByText(t("seasonEnd.finalTable"))
      .closest("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(within(details).queryByRole("table")).toBeNull();
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
    expect(await within(details).findByRole("table")).toBeDefined();
  });

  it("Ver o histórico e Próxima temporada também no fim da página", async () => {
    await open();
    expect(screen.getAllByRole("button", { name: t("seasonEnd.next") })).toHaveLength(2);
    expect(screen.getByRole("link", { name: t("seasonEnd.history") })).toBeDefined();
  });
});
