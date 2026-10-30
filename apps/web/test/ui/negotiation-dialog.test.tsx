// 028 US3: diálogo de negociação — valor de referência, erro ligado ao campo, motivo de recusa e foco.
import { searchPlayers } from "@brasfoot-like/engine";
import { marketContextOf } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { startAction } from "../helpers/market";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/mercado?c=tela");
});

async function openOffer(round = 1) {
  const career = await storedCareer(round);
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
  const dialog = await startAction(user, target.displayName, "offer");
  return { ...career, target, user, dialog };
}

describe("diálogo de negociação (028)", () => {
  it("mostra o valor de mercado como referência e o campo com rótulo", async () => {
    const { dialog } = await openOffer();
    // O valor de mercado do jogador serve de referência para a oferta.
    expect(within(dialog).getByText(/^Valor de mercado: /)).toBeDefined();
    expect(within(dialog).getByLabelText(t("market.form.fee"))).toBeDefined();
  });

  it("o erro de uma recusa vem ligado ao campo: aria-invalid e aria-describedby apontam para o alerta", async () => {
    const { dialog, user } = await openOffer(6);
    await user.click(within(dialog).getByRole("button", { name: t("market.action.offer") }));
    const alert = await within(dialog).findByRole("alert");
    const field = within(dialog).getByLabelText(t("market.form.fee"));
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect((field.getAttribute("aria-describedby") ?? "").split(" ")).toContain(alert.id);
  });

  it("uma oferta baixa demais é recusada com o motivo em texto", async () => {
    const { dialog, user } = await openOffer();
    const fee = within(dialog).getByLabelText(t("market.form.fee"));
    await user.clear(fee);
    await user.type(fee, "1");
    await user.click(within(dialog).getByRole("button", { name: t("market.action.offer") }));
    const text = await within(dialog).findByText(new RegExp(t("market.feedback.clubRefused")));
    expect(text.textContent).toMatch(/\w{4,}/);
  });

  it("Esc fecha o diálogo e o foco volta ao botão do modal", async () => {
    const { user, target } = await openOffer();
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: t("market.dialog.buy", { name: target.displayName }) }),
    ).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: t("market.action.offer") }),
    );
  });
});
