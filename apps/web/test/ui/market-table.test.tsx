// 028 US1: tabela do Mercado paginada, sem coluna de ações, com a linha clicável e a caixa de comparação.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/mercado?c=tela");
});

describe("tabela do Mercado (028)", () => {
  it("não tem coluna de ações nem botões de oferta por linha, e traz uma caixa de comparação por jogador", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    const table = await screen.findByRole("table", { name: t("market.resultsCaption") });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.replace(/[▲▼]/g, "").trim());
    expect(headers).not.toContain("Ações");
    expect(within(table).getAllByRole("checkbox").length).toBeGreaterThan(0);
    expect(within(table).queryAllByRole("button", { name: t("market.action.offer") })).toHaveLength(
      0,
    );
    for (const key of [
      "col.player",
      "col.playerPosition",
      "col.age",
      "col.strength",
      "market.col.club",
      "market.col.value",
      "market.col.wage",
      "market.col.until",
    ]) {
      expect(headers).toContain(t(key));
    }
  });

  it("clicar na linha ou no nome abre o modal uma só vez; Esc fecha", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    const user = userEvent.setup({ delay: null });
    const table = await screen.findByRole("table", { name: t("market.resultsCaption") });
    const first = within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole(
      "row",
    )[0] as HTMLElement;
    const name = within(first).getAllByRole("button")[0]?.textContent ?? "";
    await user.click(within(first).getAllByRole("cell")[1] as HTMLElement);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name })).toBeDefined();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(within(first).getByRole("button", { name: t("lineup.detailsOf", { name }) }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("a lista é paginada de 50 em 50 e o filtro sem resultado mostra o estado vazio com Limpar filtros", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    const bodyRows = () =>
      within(
        within(screen.getByRole("table", { name: t("market.resultsCaption") })).getAllByRole(
          "rowgroup",
        )[1] as HTMLElement,
      ).getAllByRole("row");
    expect(bodyRows()).toHaveLength(50);
    const firstName = bodyRows()[0]?.textContent;
    await user.click(screen.getByRole("button", { name: t("pager.next") }));
    expect(bodyRows()).toHaveLength(50);
    expect(bodyRows()[0]?.textContent).not.toBe(firstName);
    await user.click(screen.getByRole("button", { name: t("pager.prev") }));
    expect(bodyRows()[0]?.textContent).toBe(firstName);
    await user.type(screen.getByLabelText(t("market.filter.text")), "zzzzzz-ninguem");
    expect(await screen.findByText(t("market.empty"))).toBeDefined();
    const clear = screen.getAllByRole("button", { name: t("market.filter.clear") });
    await user.click(clear[clear.length - 1] as HTMLElement);
    expect(await screen.findByRole("table", { name: t("market.resultsCaption") })).toBeDefined();
  });
});

describe("mercado: caixa de comparação, filtros recolhíveis e clique fora (028)", () => {
  it("a caixa ao lado do nome marca para a comparação sem abrir o modal e trava no limite", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    const user = userEvent.setup({ delay: null });
    const table = await screen.findByRole("table", { name: t("market.resultsCaption") });
    const boxes = within(table).getAllByRole("checkbox");
    for (const box of boxes.slice(0, 4)) await user.click(box);
    expect(screen.queryByRole("dialog")).toBeNull();
    const tray = screen.getByRole("region", { name: t("market.tray.label") });
    expect(within(tray).getAllByRole("listitem")).toHaveLength(4);
    expect((boxes[4] as HTMLInputElement).disabled).toBe(true);
    await user.click(boxes[0] as HTMLElement);
    expect(within(tray).getAllByRole("listitem")).toHaveLength(3);
  });

  it("o resumo dos filtros recolhe e expande a área", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    const summary = screen.getByText(t("market.filter.title"), { selector: "summary" });
    const details = summary.closest("details") as HTMLDetailsElement;
    expect(details.open).toBe(true);
    await user.click(summary);
    expect(details.open).toBe(false);
    await user.click(summary);
    expect(details.open).toBe(true);
  });

  it("clicar fora do modal do jogador o fecha", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/mercado?c=tela", store);
    const user = userEvent.setup({ delay: null });
    const table = await screen.findByRole("table", { name: t("market.resultsCaption") });
    const name = within(table).getAllByRole("button", { name: /^Detalhes de / })[0];
    await user.click(name as HTMLElement);
    const modal = await screen.findByRole("dialog");
    await user.click(modal.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
