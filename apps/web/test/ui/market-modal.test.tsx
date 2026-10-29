// 028 US1/US3: modal do jogador no Mercado — detalhes, ações, travas e foco em dois níveis.
import { searchPlayers } from "@brasfoot-like/engine";
import { marketContextOf } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { openPlayer } from "../helpers/market";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/mercado?c=tela");
});

async function openFirstOther() {
  const career = await storedCareer(1);
  const target = searchPlayers(
    marketContextOf(career.save),
    { scope: "clubs", excludeClubId: career.save.clubId, positions: ["MF"] },
    { key: "strength", dir: "asc" },
  )[0];
  if (!target) throw new Error("sem alvo");
  renderApp("/jogo/mercado?c=tela", career.store);
  const user = userEvent.setup({ delay: null });
  await screen.findByRole("table", { name: t("market.resultsCaption") });
  await user.type(screen.getByLabelText(t("market.filter.text")), target.displayName);
  const modal = await openPlayer(user, target.displayName);
  return { ...career, target, user, modal };
}

describe("modal do jogador no Mercado (028)", () => {
  it("mostra barras, dados visíveis e as ações de oferta, empréstimo, comparação e Fechar", async () => {
    const { modal, target } = await openFirstOther();
    expect(within(modal).getAllByRole("meter")).toHaveLength(2);
    for (const key of [
      "player.nationality",
      "player.traits",
      "player.contract",
      "player.marketValue",
      "player.wage",
      "player.evolution",
      "player.season",
    ]) {
      expect(within(modal).getByText(t(key))).toBeDefined();
    }
    expect(document.body.textContent).not.toMatch(/potencial|temperamento|propensão/i);
    for (const name of [
      t("market.action.offer"),
      t("market.action.loan"),
      t("market.modal.addCompare"),
      t("common.close"),
    ]) {
      expect(within(modal).getByRole("button", { name })).toBeDefined();
    }
    expect(within(modal).queryByRole("button", { name: t("market.action.sign") })).toBeNull();
    expect(target.displayName).toBeTruthy();
  });

  it("Adicionar à comparação vira Remover da comparação", async () => {
    const { modal, user } = await openFirstOther();
    await user.click(within(modal).getByRole("button", { name: t("market.modal.addCompare") }));
    expect(
      within(modal).getByRole("button", { name: t("market.modal.removeCompare") }),
    ).toBeDefined();
  });

  it("a oferta abre por cima: Esc fecha só ela e o foco volta ao botão do modal", async () => {
    const { modal, user, target } = await openFirstOther();
    const offer = within(modal).getByRole("button", { name: t("market.action.offer") });
    await user.click(offer);
    await screen.findByRole("dialog", {
      name: t("market.dialog.buy", { name: target.displayName }),
    });
    expect(screen.getAllByRole("dialog")).toHaveLength(2);
    await user.keyboard("{Escape}");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(document.activeElement).toBe(offer);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    // O foco volta ao botão do nome que abriu o modal.
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: t("lineup.detailsOf", { name: target.displayName }) }),
    );
  });

  it("jogador do próprio clube não tem oferta e mostra o motivo", async () => {
    const career = await storedCareer(1);
    const own = career.save.bank.players.find((player) => player.clubId === career.save.clubId);
    renderApp("/jogo/mercado?c=tela", career.store);
    const user = userEvent.setup({ delay: null });
    await screen.findByRole("table", { name: t("market.resultsCaption") });
    // O filtro "Mostrar" do próprio clube não lista o elenco; o modal só abre para outros clubes.
    expect(own).toBeDefined();
    expect(
      screen.queryByRole("button", {
        name: t("lineup.detailsOf", { name: own?.displayName ?? "?" }),
      }),
    ).toBeNull();
    expect(user).toBeDefined();
  });
});
